<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use App\Services\PdfService;
use App\Services\EmailService;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    private SupabaseService $supabase;
    private PdfService $pdf;
    private EmailService $email;

    public function __construct(SupabaseService $supabase, PdfService $pdf, EmailService $email)
    {
        $this->supabase = $supabase;
        $this->pdf = $pdf;
        $this->email = $email;
    }

    public function index(Request $request)
    {
        $tab = $request->get('tab', 'invoices');
        $userId = session('user')['id'];

        $companyInfo = $this->getCompanyInfo();
        $clients = $this->getClients();
        $invoices = [];
        $quotes = [];

        if ($tab === 'invoices' || $tab === 'all') {
            $invoices = $this->supabase->query('invoices', [
                'filter' => ['user_id' => $userId],
                'order' => 'invoice_date.desc'
            ]);
        }

        if ($tab === 'quotes' || $tab === 'all') {
            $quotes = $this->supabase->query('quotes', [
                'filter' => ['user_id' => $userId],
                'order' => 'quote_date.desc'
            ]);
        }

        return view('billing.index', compact('tab', 'companyInfo', 'clients', 'invoices', 'quotes'));
    }

    public function companySettings()
    {
        $companyInfo = $this->getCompanyInfo();
        return view('billing.company', compact('companyInfo'));
    }

    public function saveCompanySettings(Request $request)
    {
        $request->validate([
            'company_name' => 'required|string|max:255',
            'siret' => 'nullable|string|max:14',
            'address' => 'required|string',
            'postal_code' => 'required|string|max:10',
            'city' => 'required|string|max:255',
            'country' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email'
        ]);

        $userId = session('user')['id'];

        $existing = $this->getCompanyInfo();

        $data = [
            'user_id' => $userId,
            'company_name' => $request->company_name,
            'siret' => $request->siret,
            'address' => $request->address,
            'postal_code' => $request->postal_code,
            'city' => $request->city,
            'country' => $request->country,
            'phone' => $request->phone,
            'email' => $request->email
        ];

        if ($existing) {
            $this->supabase->update('company_info', $data, ['user_id' => $userId], session('access_token'));
        } else {
            $this->supabase->insert('company_info', $data, session('access_token'));
        }

        return back()->with('success', 'Informations entreprise enregistrées !');
    }

    public function createClient(Request $request)
    {
        $request->validate([
            'is_company' => 'required|boolean',
            'company_name' => 'required_if:is_company,true',
            'siret' => 'nullable|string',
            'first_name' => 'required_if:is_company,false',
            'last_name' => 'required_if:is_company,false',
            'address' => 'required|string',
            'postal_code' => 'required|string',
            'city' => 'required|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string'
        ]);

        $userId = session('user')['id'];

        $clientData = [
            'user_id' => $userId,
            'is_company' => $request->is_company,
            'company_name' => $request->company_name,
            'siret' => $request->siret,
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'address' => $request->address,
            'postal_code' => $request->postal_code,
            'city' => $request->city,
            'email' => $request->email,
            'phone' => $request->phone
        ];

        $result = $this->supabase->insert('billing_clients', $clientData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la création']);
        }

        return back()->with('success', 'Client créé !');
    }

    public function createInvoice(Request $request)
    {
        $request->validate([
            'client_id' => 'required|uuid',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date',
            'items' => 'required|json',
            'vat_rate' => 'required|numeric',
            'notes' => 'nullable|string'
        ]);

        $userId = session('user')['id'];

        $items = json_decode($request->items, true);
        $subtotalHt = 0;

        foreach ($items as $item) {
            $subtotalHt += $item['total'];
        }

        $vatAmount = $subtotalHt * ($request->vat_rate / 100);
        $totalTtc = $subtotalHt + $vatAmount;

        $invoiceNumber = $this->generateInvoiceNumber();

        $invoiceData = [
            'user_id' => $userId,
            'client_id' => $request->client_id,
            'invoice_number' => $invoiceNumber,
            'invoice_date' => $request->invoice_date,
            'due_date' => $request->due_date,
            'subtotal_ht' => $subtotalHt,
            'vat_rate' => $request->vat_rate,
            'vat_amount' => $vatAmount,
            'total_ttc' => $totalTtc,
            'status' => 'draft',
            'items' => $request->items,
            'notes' => $request->notes
        ];

        $result = $this->supabase->insert('invoices', $invoiceData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la création']);
        }

        return back()->with('success', "Facture {$invoiceNumber} créée !");
    }

    public function createQuote(Request $request)
    {
        $request->validate([
            'client_id' => 'required|uuid',
            'quote_date' => 'required|date',
            'validity_date' => 'required|date',
            'items' => 'required|json',
            'vat_rate' => 'required|numeric',
            'notes' => 'nullable|string'
        ]);

        $userId = session('user')['id'];

        $items = json_decode($request->items, true);
        $subtotalHt = 0;

        foreach ($items as $item) {
            $subtotalHt += $item['total'];
        }

        $vatAmount = $subtotalHt * ($request->vat_rate / 100);
        $totalTtc = $subtotalHt + $vatAmount;

        $quoteNumber = $this->generateQuoteNumber();

        $quoteData = [
            'user_id' => $userId,
            'client_id' => $request->client_id,
            'quote_number' => $quoteNumber,
            'quote_date' => $request->quote_date,
            'validity_date' => $request->validity_date,
            'subtotal_ht' => $subtotalHt,
            'vat_rate' => $request->vat_rate,
            'vat_amount' => $vatAmount,
            'total_ttc' => $totalTtc,
            'status' => 'draft',
            'items' => $request->items,
            'notes' => $request->notes
        ];

        $result = $this->supabase->insert('quotes', $quoteData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la création']);
        }

        return back()->with('success', "Devis {$quoteNumber} créé !");
    }

    public function updateInvoiceStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:draft,sent,paid,overdue,cancelled'
        ]);

        $this->supabase->update('invoices', ['status' => $request->status], ['id' => $id], session('access_token'));

        return back()->with('success', 'Statut mis à jour !');
    }

    public function updateQuoteStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:draft,sent,accepted,rejected,expired'
        ]);

        $this->supabase->update('quotes', ['status' => $request->status], ['id' => $id], session('access_token'));

        return back()->with('success', 'Statut mis à jour !');
    }

    public function downloadInvoicePdf($id)
    {
        $invoice = $this->getInvoiceById($id);
        $companyInfo = $this->getCompanyInfo();
        $client = $this->getClientById($invoice['client_id']);

        if (!$invoice || !$companyInfo || !$client) {
            return back()->withErrors(['error' => 'Données manquantes']);
        }

        $pdfContent = $this->pdf->generateInvoice($invoice, $companyInfo, $client);

        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', "attachment; filename=\"facture-{$invoice['invoice_number']}.pdf\"");
    }

    public function downloadQuotePdf($id)
    {
        $quote = $this->getQuoteById($id);
        $companyInfo = $this->getCompanyInfo();
        $client = $this->getClientById($quote['client_id']);

        if (!$quote || !$companyInfo || !$client) {
            return back()->withErrors(['error' => 'Données manquantes']);
        }

        $pdfContent = $this->pdf->generateQuote($quote, $companyInfo, $client);

        return response($pdfContent)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', "attachment; filename=\"devis-{$quote['quote_number']}.pdf\"");
    }

    public function sendInvoiceEmail(Request $request, $id)
    {
        $request->validate([
            'recipient_email' => 'required|email'
        ]);

        $invoice = $this->getInvoiceById($id);
        $companyInfo = $this->getCompanyInfo();
        $client = $this->getClientById($invoice['client_id']);

        $pdfContent = $this->pdf->generateInvoice($invoice, $companyInfo, $client);
        $pdfPath = storage_path("app/facture-{$invoice['invoice_number']}.pdf");
        file_put_contents($pdfPath, $pdfContent);

        $sent = $this->email->sendInvoice($request->recipient_email, $invoice, $pdfPath);

        unlink($pdfPath);

        if ($sent) {
            return back()->with('success', 'Facture envoyée par email !');
        }

        return back()->withErrors(['error' => 'Erreur lors de l\'envoi']);
    }

    public function convertQuoteToInvoice($quoteId)
    {
        $quote = $this->getQuoteById($quoteId);

        if (!$quote) {
            return back()->withErrors(['error' => 'Devis introuvable']);
        }

        $userId = session('user')['id'];
        $invoiceNumber = $this->generateInvoiceNumber();

        $invoiceData = [
            'user_id' => $userId,
            'client_id' => $quote['client_id'],
            'invoice_number' => $invoiceNumber,
            'invoice_date' => date('Y-m-d'),
            'due_date' => date('Y-m-d', strtotime('+30 days')),
            'subtotal_ht' => $quote['subtotal_ht'],
            'vat_rate' => $quote['vat_rate'],
            'vat_amount' => $quote['vat_amount'],
            'total_ttc' => $quote['total_ttc'],
            'status' => 'draft',
            'items' => $quote['items'],
            'notes' => $quote['notes']
        ];

        $result = $this->supabase->insert('invoices', $invoiceData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la conversion']);
        }

        $this->supabase->update('quotes', ['status' => 'accepted'], ['id' => $quoteId], session('access_token'));

        return redirect('/billing?tab=invoices')->with('success', "Facture {$invoiceNumber} créée à partir du devis !");
    }

    private function getCompanyInfo()
    {
        $userId = session('user')['id'];
        $result = $this->supabase->query('company_info', [
            'filter' => ['user_id' => $userId],
            'limit' => 1
        ]);

        return !empty($result) && !isset($result['error']) ? $result[0] : null;
    }

    private function getClients()
    {
        $userId = session('user')['id'];
        $result = $this->supabase->query('billing_clients', [
            'filter' => ['user_id' => $userId],
            'order' => 'created_at.desc'
        ]);

        return !isset($result['error']) ? $result : [];
    }

    private function getClientById($clientId)
    {
        $result = $this->supabase->query('billing_clients', [
            'filter' => ['id' => $clientId],
            'limit' => 1
        ]);

        return !empty($result) && !isset($result['error']) ? $result[0] : null;
    }

    private function getInvoiceById($id)
    {
        $result = $this->supabase->query('invoices', [
            'filter' => ['id' => $id],
            'limit' 1
        ]);

        return !empty($result) && !isset($result['error']) ? $result[0] : null;
    }

    private function getQuoteById($id)
    {
        $result = $this->supabase->query('quotes', [
            'filter' => ['id' => $id],
            'limit' => 1
        ]);

        return !empty($result) && !isset($result['error']) ? $result[0] : null;
    }

    private function generateInvoiceNumber(): string
    {
        $year = date('Y');
        $userId = session('user')['id'];

        $invoices = $this->supabase->query('invoices', [
            'filter' => ['user_id' => $userId]
        ]);

        $count = !isset($invoices['error']) ? count($invoices) : 0;
        $nextNumber = str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        return "FACT-{$year}-{$nextNumber}";
    }

    private function generateQuoteNumber(): string
    {
        $year = date('Y');
        $userId = session('user')['id'];

        $quotes = $this->supabase->query('quotes', [
            'filter' => ['user_id' => $userId]
        ]);

        $count = !isset($quotes['error']) ? count($quotes) : 0;
        $nextNumber = str_pad($count + 1, 4, '0', STR_PAD_LEFT);

        return "DEVIS-{$year}-{$nextNumber}";
    }
}
