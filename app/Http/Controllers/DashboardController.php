<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private SupabaseService $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    public function index(Request $request)
    {
        $userId = session('user')['id'];
        $accessToken = session('access_token');

        $missions = $this->supabase->query('missions', [
            'filter' => ['creator_id' => $userId],
            'order' => 'created_at.desc',
            'limit' => 100
        ]);

        $activeMissions = 0;
        $completedMissions = 0;
        $pendingMissions = 0;
        $inProgressMissions = 0;
        $recentMissions = [];

        if (!isset($missions['error'])) {
            foreach ($missions as $mission) {
                if ($mission['status'] === 'completed') {
                    $completedMissions++;
                } elseif ($mission['status'] === 'in_progress') {
                    $inProgressMissions++;
                    $activeMissions++;
                } elseif ($mission['status'] === 'pending') {
                    $pendingMissions++;
                    $activeMissions++;
                } elseif ($mission['status'] === 'draft') {
                    $activeMissions++;
                }
            }

            $recentMissions = array_slice($missions, 0, 5);
        }

        $contacts = $this->supabase->query('contacts', [
            'filter' => ['user_id' => $userId],
            'limit' => 1000
        ]);

        $contactsCount = !isset($contacts['error']) ? count($contacts) : 0;

        $totalRevenue = $completedMissions * 150;

        $stats = [
            'active_missions' => $activeMissions,
            'completed_missions' => $completedMissions,
            'pending_missions' => $pendingMissions,
            'in_progress_missions' => $inProgressMissions,
            'total_revenue' => $totalRevenue,
            'contacts_count' => $contactsCount,
            'average_rating' => 4.8
        ];

        $monthlyData = $this->getMonthlyMissionsData($missions);

        return view('dashboard', compact('stats', 'recentMissions', 'monthlyData'));
    }

    private function getMonthlyMissionsData($missions): array
    {
        $monthlyData = [
            'labels' => [],
            'completed' => [],
            'in_progress' => [],
            'pending' => []
        ];

        if (isset($missions['error'])) {
            return $monthlyData;
        }

        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = date('Y-m', strtotime("-$i months"));
            $months[$date] = [
                'completed' => 0,
                'in_progress' => 0,
                'pending' => 0
            ];
            $monthlyData['labels'][] = date('M Y', strtotime("-$i months"));
        }

        foreach ($missions as $mission) {
            $month = date('Y-m', strtotime($mission['created_at']));
            if (isset($months[$month])) {
                if ($mission['status'] === 'completed') {
                    $months[$month]['completed']++;
                } elseif ($mission['status'] === 'in_progress') {
                    $months[$month]['in_progress']++;
                } elseif ($mission['status'] === 'pending') {
                    $months[$month]['pending']++;
                }
            }
        }

        foreach ($months as $data) {
            $monthlyData['completed'][] = $data['completed'];
            $monthlyData['in_progress'][] = $data['in_progress'];
            $monthlyData['pending'][] = $data['pending'];
        }

        return $monthlyData;
    }
}
