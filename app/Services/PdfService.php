<?php

namespace App\Services;

use TCPDF;

class PdfService
{
    public function generateInvoice(array $invoice, array $company, array $client): string
    {
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8');

        $pdf->SetCreator('FleetCheck');
        $pdf->SetAuthor($company['company_name']);
        $pdf->SetTitle("Facture {$invoice['invoice_number']}");

        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);

        $pdf->AddPage();

        $pdf->SetFont('helvetica', 'B', 20);
        $pdf->Cell(0, 10, 'FACTURE', 0, 1, 'R');

        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 8, $company['company_name'], 0, 1);

        $pdf->SetFont('helvetica', '', 10);
        $pdf->MultiCell(90, 5,
            $company['address'] . "\n" .
            $company['postal_code'] . ' ' . $company['city'] . "\n" .
            "SIRET: " . ($company['siret'] ?? 'N/A') . "\n" .
            "Email: " . $company['email'] . "\n" .
            "Tél: " . $company['phone'],
            0, 'L'
        );

        $pdf->Ln(5);

        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 7, 'Facturé à:', 0, 1);
        $pdf->SetFont('helvetica', '', 10);

        $clientName = $client['is_company']
            ? $client['company_name']
            : $client['first_name'] . ' ' . $client['last_name'];

        $pdf->MultiCell(90, 5,
            $clientName . "\n" .
            $client['address'] . "\n" .
            $client['postal_code'] . ' ' . $client['city'] . "\n" .
            ($client['is_company'] ? "SIRET: " . $client['siret'] . "\n" : "") .
            "Email: " . ($client['email'] ?? 'N/A'),
            0, 'L'
        );

        $pdf->Ln(10);

        $pdf->SetFont('helvetica', 'B', 11);
        $pdf->Cell(100, 7, 'N° Facture:', 0, 0);
        $pdf->SetFont('helvetica', '', 11);
        $pdf->Cell(0, 7, $invoice['invoice_number'], 0, 1);

        $pdf->SetFont('helvetica', 'B', 11);
        $pdf->Cell(100, 7, 'Date:', 0, 0);
        $pdf->SetFont('helvetica', '', 11);
        $pdf->Cell(0, 7, date('d/m/Y', strtotime($invoice['invoice_date'])), 0, 1);

        $pdf->SetFont('helvetica', 'B', 11);
        $pdf->Cell(100, 7, 'Date d\'échéance:', 0, 0);
        $pdf->SetFont('helvetica', '', 11);
        $pdf->Cell(0, 7, date('d/m/Y', strtotime($invoice['due_date'])), 0, 1);

        $pdf->Ln(10);

        $pdf->SetFillColor(20, 184, 166);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(90, 8, 'Description', 1, 0, 'L', true);
        $pdf->Cell(25, 8, 'Quantité', 1, 0, 'C', true);
        $pdf->Cell(30, 8, 'Prix unit. HT', 1, 0, 'R', true);
        $pdf->Cell(35, 8, 'Total HT', 1, 1, 'R', true);

        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 9);

        $items = json_decode($invoice['items'], true);
        foreach ($items as $item) {
            $pdf->Cell(90, 7, $item['description'], 1, 0, 'L');
            $pdf->Cell(25, 7, $item['quantity'], 1, 0, 'C');
            $pdf->Cell(30, 7, number_format($item['unit_price'], 2) . ' €', 1, 0, 'R');
            $pdf->Cell(35, 7, number_format($item['total'], 2) . ' €', 1, 1, 'R');
        }

        $pdf->Ln(5);

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(145, 7, 'Total HT', 1, 0, 'R');
        $pdf->Cell(35, 7, number_format($invoice['subtotal_ht'], 2) . ' €', 1, 1, 'R');

        $pdf->Cell(145, 7, "TVA ({$invoice['vat_rate']}%)", 1, 0, 'R');
        $pdf->Cell(35, 7, number_format($invoice['vat_amount'], 2) . ' €', 1, 1, 'R');

        $pdf->SetFillColor(20, 184, 166);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(145, 10, 'Total TTC', 1, 0, 'R', true);
        $pdf->Cell(35, 10, number_format($invoice['total_ttc'], 2) . ' €', 1, 1, 'R', true);

        if (!empty($invoice['notes'])) {
            $pdf->Ln(10);
            $pdf->SetTextColor(0, 0, 0);
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->Cell(0, 7, 'Notes:', 0, 1);
            $pdf->SetFont('helvetica', '', 9);
            $pdf->MultiCell(0, 5, $invoice['notes']);
        }

        $pdf->Ln(10);
        $pdf->SetFont('helvetica', 'I', 8);
        $pdf->SetTextColor(100, 100, 100);
        $pdf->Cell(0, 5, 'Conditions de paiement: Paiement à réception. En cas de retard, des pénalités de 3 fois le taux d\'intérêt légal seront appliquées.', 0, 1, 'C');

        return $pdf->Output('', 'S');
    }

    public function generateQuote(array $quote, array $company, array $client): string
    {
        $pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8');

        $pdf->SetCreator('FleetCheck');
        $pdf->SetAuthor($company['company_name']);
        $pdf->SetTitle("Devis {$quote['quote_number']}");

        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);

        $pdf->AddPage();

        $pdf->SetFont('helvetica', 'B', 20);
        $pdf->Cell(0, 10, 'DEVIS', 0, 1, 'R');

        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 8, $company['company_name'], 0, 1);

        $pdf->SetFont('helvetica', '', 10);
        $pdf->MultiCell(90, 5,
            $company['address'] . "\n" .
            $company['postal_code'] . ' ' . $company['city'] . "\n" .
            "SIRET: " . ($company['siret'] ?? 'N/A') . "\n" .
            "Email: " . $company['email'] . "\n" .
            "Tél: " . $company['phone'],
            0, 'L'
        );

        $pdf->Ln(5);

        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(0, 7, 'Client:', 0, 1);
        $pdf->SetFont('helvetica', '', 10);

        $clientName = $client['is_company']
            ? $client['company_name']
            : $client['first_name'] . ' ' . $client['last_name'];

        $pdf->MultiCell(90, 5,
            $clientName . "\n" .
            $client['address'] . "\n" .
            $client['postal_code'] . ' ' . $client['city'],
            0, 'L'
        );

        $pdf->Ln(10);

        $pdf->SetFont('helvetica', 'B', 11);
        $pdf->Cell(100, 7, 'N° Devis:', 0, 0);
        $pdf->SetFont('helvetica', '', 11);
        $pdf->Cell(0, 7, $quote['quote_number'], 0, 1);

        $pdf->SetFont('helvetica', 'B', 11);
        $pdf->Cell(100, 7, 'Date:', 0, 0);
        $pdf->SetFont('helvetica', '', 11);
        $pdf->Cell(0, 7, date('d/m/Y', strtotime($quote['quote_date'])), 0, 1);

        $pdf->SetFont('helvetica', 'B', 11);
        $pdf->Cell(100, 7, 'Valable jusqu\'au:', 0, 0);
        $pdf->SetFont('helvetica', '', 11);
        $pdf->Cell(0, 7, date('d/m/Y', strtotime($quote['validity_date'])), 0, 1);

        $pdf->Ln(10);

        $pdf->SetFillColor(6, 182, 212);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(90, 8, 'Description', 1, 0, 'L', true);
        $pdf->Cell(25, 8, 'Quantité', 1, 0, 'C', true);
        $pdf->Cell(30, 8, 'Prix unit. HT', 1, 0, 'R', true);
        $pdf->Cell(35, 8, 'Total HT', 1, 1, 'R', true);

        $pdf->SetTextColor(0, 0, 0);
        $pdf->SetFont('helvetica', '', 9);

        $items = json_decode($quote['items'], true);
        foreach ($items as $item) {
            $pdf->Cell(90, 7, $item['description'], 1, 0, 'L');
            $pdf->Cell(25, 7, $item['quantity'], 1, 0, 'C');
            $pdf->Cell(30, 7, number_format($item['unit_price'], 2) . ' €', 1, 0, 'R');
            $pdf->Cell(35, 7, number_format($item['total'], 2) . ' €', 1, 1, 'R');
        }

        $pdf->Ln(5);

        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->Cell(145, 7, 'Total HT', 1, 0, 'R');
        $pdf->Cell(35, 7, number_format($quote['subtotal_ht'], 2) . ' €', 1, 1, 'R');

        $pdf->Cell(145, 7, "TVA ({$quote['vat_rate']}%)", 1, 0, 'R');
        $pdf->Cell(35, 7, number_format($quote['vat_amount'], 2) . ' €', 1, 1, 'R');

        $pdf->SetFillColor(6, 182, 212);
        $pdf->SetTextColor(255, 255, 255);
        $pdf->SetFont('helvetica', 'B', 12);
        $pdf->Cell(145, 10, 'Total TTC', 1, 0, 'R', true);
        $pdf->Cell(35, 10, number_format($quote['total_ttc'], 2) . ' €', 1, 1, 'R', true);

        if (!empty($quote['notes'])) {
            $pdf->Ln(10);
            $pdf->SetTextColor(0, 0, 0);
            $pdf->SetFont('helvetica', 'B', 10);
            $pdf->Cell(0, 7, 'Notes:', 0, 1);
            $pdf->SetFont('helvetica', '', 9);
            $pdf->MultiCell(0, 5, $quote['notes']);
        }

        return $pdf->Output('', 'S');
    }
}
