<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use App\Services\EmailService;
use Illuminate\Http\Request;
use ZipArchive;

class ReportController extends Controller
{
    private SupabaseService $supabase;
    private EmailService $email;

    public function __construct(SupabaseService $supabase, EmailService $email)
    {
        $this->supabase = $supabase;
        $this->email = $email;
    }

    public function index(Request $request)
    {
        $userId = session('user')['id'];
        $search = $request->get('search');
        $showArchived = $request->get('archived', false);

        $missions = $this->supabase->query('missions', [
            'filter' => ['status' => 'completed'],
            'order' => 'updated_at.desc'
        ]);

        if (!isset($missions['error'])) {
            $missions = array_filter($missions, function ($m) use ($userId, $showArchived) {
                $isOwner = $m['creator_id'] === $userId || $m['assigned_to'] === $userId;
                $archivedMatch = $showArchived ? true : !($m['archived'] ?? false);
                return $isOwner && $archivedMatch;
            });

            if ($search) {
                $missions = array_filter($missions, function ($m) use ($search) {
                    return stripos($m['reference'], $search) !== false ||
                        stripos($m['title'], $search) !== false ||
                        stripos($m['pickup_address'], $search) !== false ||
                        stripos($m['delivery_address'], $search) !== false;
                });
            }
        }

        return view('reports.index', compact('missions', 'search', 'showArchived'));
    }

    public function show($id)
    {
        $mission = $this->getMissionById($id);

        if (!$mission) {
            return redirect('/reports')->withErrors(['error' => 'Mission introuvable']);
        }

        $inspectionDeparture = $this->supabase->query('inspection_departures', [
            'filter' => ['mission_id' => $id],
            'limit' => 1
        ]);

        $inspectionArrival = $this->supabase->query('inspection_arrivals', [
            'filter' => ['mission_id' => $id],
            'limit' => 1
        ]);

        $departurePhotos = [];
        $arrivalPhotos = [];

        if (!empty($inspectionDeparture) && isset($inspectionDeparture[0]['photos'])) {
            $departurePhotos = json_decode($inspectionDeparture[0]['photos'], true) ?? [];
        }

        if (!empty($inspectionArrival) && isset($inspectionArrival[0]['photos'])) {
            $arrivalPhotos = json_decode($inspectionArrival[0]['photos'], true) ?? [];
        }

        return view('reports.show', [
            'mission' => $mission,
            'inspectionDeparture' => !empty($inspectionDeparture) ? $inspectionDeparture[0] : null,
            'inspectionArrival' => !empty($inspectionArrival) ? $inspectionArrival[0] : null,
            'departurePhotos' => $departurePhotos,
            'arrivalPhotos' => $arrivalPhotos
        ]);
    }

    public function sendEmail(Request $request, $id)
    {
        $request->validate([
            'recipient_email' => 'required|email'
        ]);

        $mission = $this->getMissionById($id);

        if (!$mission) {
            return back()->withErrors(['error' => 'Mission introuvable']);
        }

        $photos = $this->getMissionPhotos($id);

        $sent = $this->email->sendMissionReport($request->recipient_email, $mission, $photos);

        if ($sent) {
            return back()->with('success', 'Rapport envoyé par email !');
        }

        return back()->withErrors(['error' => 'Erreur lors de l\'envoi']);
    }

    public function downloadPhotos($id)
    {
        $mission = $this->getMissionById($id);

        if (!$mission) {
            return redirect('/reports')->withErrors(['error' => 'Mission introuvable']);
        }

        $photos = $this->getMissionPhotos($id);

        if (empty($photos)) {
            return back()->withErrors(['error' => 'Aucune photo disponible']);
        }

        $zipFilename = "mission-{$mission['reference']}-photos.zip";
        $zipPath = storage_path("app/{$zipFilename}");

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return back()->withErrors(['error' => 'Erreur lors de la création du ZIP']);
        }

        foreach ($photos as $index => $photoUrl) {
            $photoContent = @file_get_contents($photoUrl);
            if ($photoContent) {
                $extension = pathinfo(parse_url($photoUrl, PHP_URL_PATH), PATHINFO_EXTENSION);
                $zip->addFromString("photo-" . ($index + 1) . "." . $extension, $photoContent);
            }
        }

        $zip->close();

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    public function archive($id)
    {
        $this->supabase->update('missions', ['archived' => true], ['id' => $id], session('access_token'));
        return redirect('/reports')->with('success', 'Rapport archivé');
    }

    public function unarchive($id)
    {
        $this->supabase->update('missions', ['archived' => false], ['id' => $id], session('access_token'));
        return redirect('/reports')->with('success', 'Rapport désarchivé');
    }

    public function exportCsv()
    {
        $userId = session('user')['id'];
        $missions = $this->supabase->query('missions', [
            'filter' => ['status' => 'completed', 'creator_id' => $userId]
        ]);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="rapports_' . date('Y-m-d') . '.csv"');

        $output = fopen('php://output', 'w');
        fputcsv($output, ['Référence', 'Titre', 'Départ', 'Arrivée', 'Véhicule', 'Date achèvement']);

        if (!isset($missions['error'])) {
            foreach ($missions as $mission) {
                fputcsv($output, [
                    $mission['reference'],
                    $mission['title'],
                    $mission['pickup_address'],
                    $mission['delivery_address'],
                    ($mission['vehicle_make'] ?? '') . ' ' . ($mission['vehicle_model'] ?? ''),
                    date('d/m/Y', strtotime($mission['updated_at']))
                ]);
            }
        }

        fclose($output);
        exit;
    }

    private function getMissionById($id)
    {
        $missions = $this->supabase->query('missions', [
            'filter' => ['id' => $id],
            'limit' => 1
        ]);

        return !empty($missions) && !isset($missions['error']) ? $missions[0] : null;
    }

    private function getMissionPhotos($missionId): array
    {
        $photos = [];

        $departure = $this->supabase->query('inspection_departures', [
            'filter' => ['mission_id' => $missionId],
            'limit' => 1
        ]);

        if (!empty($departure) && isset($departure[0]['photos'])) {
            $departurePhotos = json_decode($departure[0]['photos'], true) ?? [];
            foreach ($departurePhotos as $photo) {
                $photos[] = $this->supabase->getPublicUrl('mission-photos', $photo);
            }
        }

        $arrival = $this->supabase->query('inspection_arrivals', [
            'filter' => ['mission_id' => $missionId],
            'limit' => 1
        ]);

        if (!empty($arrival) && isset($arrival[0]['photos'])) {
            $arrivalPhotos = json_decode($arrival[0]['photos'], true) ?? [];
            foreach ($arrivalPhotos as $photo) {
                $photos[] = $this->supabase->getPublicUrl('mission-photos', $photo);
            }
        }

        return $photos;
    }
}
