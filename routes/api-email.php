<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Services\EmailService;

/*
|--------------------------------------------------------------------------
| API Routes for Email Service
|--------------------------------------------------------------------------
*/

Route::middleware('api')->group(function () {
    
    /**
     * POST /api/reports/generate-pdf/{missionId}
     * Génère automatiquement un PDF après complétion d'inspection
     * 
     * Query params:
     * - inspection_type: 'departure' ou 'arrival'
     */
    Route::post('/reports/generate-pdf/{missionId}', function (Request $request, $missionId) {
        try {
            $inspectionType = $request->query('inspection_type', 'departure');
            
            // TODO: Implémenter la génération PDF via service
            // Pour l'instant, on log juste l'événement
            \Log::info("Auto-génération PDF demandée", [
                'mission_id' => $missionId,
                'inspection_type' => $inspectionType,
                'timestamp' => now()->toIso8601String(),
            ]);
            
            // Dans une version complète, on ferait:
            // 1. Récupérer les données mission + inspections depuis Supabase
            // 2. Générer le PDF avec PdfService
            // 3. Upload sur Supabase Storage
            // 4. Retourner l'URL du PDF
            
            return response()->json([
                'success' => true,
                'message' => 'PDF generation triggered',
                'mission_id' => $missionId,
                'inspection_type' => $inspectionType,
                // 'pdf_url' => '...' // URL du PDF généré
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Erreur auto-génération PDF', [
                'mission_id' => $missionId,
                'error' => $e->getMessage(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur génération PDF: ' . $e->getMessage(),
            ], 500);
        }
    });
    
    /**
     * POST /api/email/inspection-report
     * Envoie un rapport d'inspection par email
     * 
     * Body JSON:
     * {
     *   "to_email": "destinataire@example.com",
     *   "sender_name": "John Doe",
     *   "report": {
     *     "mission_reference": "MIS-2024001",
     *     "vehicle": "Peugeot 308",
     *     "is_complete": true,
     *     "departure": { ... },
     *     "arrival": { ... }
     *   },
     *   "pdf_url": "https://..../inspection.pdf",
     *   "photo_urls": ["https://.../photo1.jpg", "https://.../photo2.jpg"]
     * }
     */
    Route::post('/email/inspection-report', function (Request $request) {
        try {
            $validated = $request->validate([
                'to_email' => 'required|email',
                'sender_name' => 'required|string',
                'report' => 'required|array',
                'report.mission_reference' => 'required|string',
                'report.vehicle' => 'required|string',
                'report.is_complete' => 'required|boolean',
                'pdf_url' => 'nullable|url',
                'photo_urls' => 'nullable|array',
                'photo_urls.*' => 'url',
            ]);

            $emailService = new EmailService();

            // Télécharger le PDF si URL fournie
            $pdfPath = null;
            if (!empty($validated['pdf_url'])) {
                $pdfContent = file_get_contents($validated['pdf_url']);
                if ($pdfContent !== false) {
                    $pdfPath = sys_get_temp_dir() . '/inspection-' . uniqid() . '.pdf';
                    file_put_contents($pdfPath, $pdfContent);
                }
            }

            $success = $emailService->sendInspectionReport(
                $validated['to_email'],
                $validated['sender_name'],
                $validated['report'],
                $pdfPath,
                $validated['photo_urls'] ?? []
            );

            // Nettoyer le fichier PDF temporaire
            if ($pdfPath && file_exists($pdfPath)) {
                unlink($pdfPath);
            }

            if ($success) {
                return response()->json([
                    'success' => true,
                    'message' => 'Email envoyé avec succès'
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreur lors de l\'envoi de l\'email'
                ], 500);
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Données invalides',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            error_log('Erreur email inspection: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur serveur: ' . $e->getMessage()
            ], 500);
        }
    });

    /**
     * POST /api/email/test
     * Test simple d'envoi d'email
     */
    Route::post('/email/test', function (Request $request) {
        $validated = $request->validate([
            'to_email' => 'required|email',
        ]);

        $emailService = new EmailService();
        
        try {
            $testReport = [
                'mission_reference' => 'TEST-001',
                'vehicle' => 'Test Vehicle',
                'is_complete' => true,
                'departure' => [
                    'inspector_name' => 'Test Inspector',
                    'inspection_date' => date('Y-m-d H:i:s'),
                    'odometer_reading' => 50000,
                    'fuel_level' => 80,
                ],
                'arrival' => [
                    'inspector_name' => 'Test Inspector',
                    'inspection_date' => date('Y-m-d H:i:s'),
                    'odometer_reading' => 50250,
                    'fuel_level' => 60,
                ],
            ];

            $success = $emailService->sendInspectionReport(
                $validated['to_email'],
                'Test Sender',
                $testReport,
                null,
                []
            );

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Email de test envoyé' : 'Erreur d\'envoi'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur: ' . $e->getMessage()
            ], 500);
        }
    });
});
