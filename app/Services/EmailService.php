<?php

namespace App\Services;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailService
{
    private PHPMailer $mailer;

    public function __construct()
    {
        $this->mailer = new PHPMailer(true);

        $this->mailer->isSMTP();
        $this->mailer->Host = env('MAIL_HOST');
        $this->mailer->SMTPAuth = true;
        $this->mailer->Username = env('MAIL_USERNAME');
        $this->mailer->Password = env('MAIL_PASSWORD');
        $this->mailer->SMTPSecure = env('MAIL_ENCRYPTION', 'tls');
        $this->mailer->Port = env('MAIL_PORT', 587);
        $this->mailer->CharSet = 'UTF-8';

        $this->mailer->setFrom(env('MAIL_FROM_ADDRESS'), env('MAIL_FROM_NAME'));
    }

    public function sendInvitation(string $toEmail, string $inviterName, string $inviteLink): bool
    {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($toEmail);

            $this->mailer->isHTML(true);
            $this->mailer->Subject = "{$inviterName} vous invite sur ChecksFleet";

            $this->mailer->Body = $this->getInvitationTemplate($inviterName, $inviteLink);
            $this->mailer->AltBody = "{$inviterName} vous invite à rejoindre ChecksFleet. Cliquez sur ce lien: {$inviteLink}";

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Email error: " . $this->mailer->ErrorInfo);
            return false;
        }
    }

    public function sendMissionReport(string $toEmail, array $mission, array $photos = []): bool
    {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
            $this->mailer->addAddress($toEmail);

            $this->mailer->isHTML(true);
            $this->mailer->Subject = "Rapport de mission {$mission['reference']}";

            $this->mailer->Body = $this->getMissionReportTemplate($mission, $photos);

            foreach ($photos as $photo) {
                if (file_exists($photo)) {
                    $this->mailer->addAttachment($photo);
                }
            }

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Email error: " . $this->mailer->ErrorInfo);
            return false;
        }
    }

    public function sendInvoice(string $toEmail, array $invoice, string $pdfPath): bool
    {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
            $this->mailer->addAddress($toEmail);

            $this->mailer->isHTML(true);
            $this->mailer->Subject = "Facture {$invoice['invoice_number']} - ChecksFleet";

            $this->mailer->Body = $this->getInvoiceTemplate($invoice);

            if (file_exists($pdfPath)) {
                $this->mailer->addAttachment($pdfPath, "facture-{$invoice['invoice_number']}.pdf");
            }

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Email error: " . $this->mailer->ErrorInfo);
            return false;
        }
    }

    private function getInvitationTemplate(string $inviterName, string $inviteLink): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Invitation ChecksFleet</h1>
        </div>
        <div class="content">
            <h2>Bonjour,</h2>
            <p><strong>{$inviterName}</strong> vous invite à rejoindre ChecksFleet, la plateforme de gestion de convoyage automobile.</p>
            <p>ChecksFleet vous permet de gérer vos missions de convoyage, suivre vos véhicules, et collaborer avec votre équipe en toute simplicité.</p>
            <a href="{$inviteLink}" class="button">Accepter l'invitation</a>
            <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="{$inviteLink}">{$inviteLink}</a></p>
        </div>
        <div class="footer">
            <p>© 2025 ChecksFleet. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function getMissionReportTemplate(array $mission, array $photos): string
    {
        $photosList = '';
        foreach ($photos as $photo) {
            $photosList .= "<li>" . basename($photo) . "</li>";
        }

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #14b8a6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .info { margin: 10px 0; }
        .label { font-weight: bold; color: #14b8a6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rapport de Mission</h1>
            <h2>{$mission['reference']}</h2>
        </div>
        <div class="content">
            <div class="info">
                <span class="label">Titre:</span> {$mission['title']}
            </div>
            <div class="info">
                <span class="label">Statut:</span> {$mission['status']}
            </div>
            <div class="info">
                <span class="label">Départ:</span> {$mission['pickup_address']}
            </div>
            <div class="info">
                <span class="label">Arrivée:</span> {$mission['delivery_address']}
            </div>
            <div class="info">
                <span class="label">Véhicule:</span> {$mission['vehicle_make']} {$mission['vehicle_model']} ({$mission['vehicle_year']})
            </div>
            <h3>Photos jointes:</h3>
            <ul>{$photosList}</ul>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function getInvoiceTemplate(array $invoice): string
    {
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #14b8a6; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .total { font-size: 24px; color: #14b8a6; font-weight: bold; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Facture {$invoice['invoice_number']}</h1>
        </div>
        <div class="content">
            <p>Bonjour,</p>
            <p>Veuillez trouver ci-joint votre facture d'un montant de:</p>
            <div class="total">{$invoice['total_ttc']} € TTC</div>
            <p>Date d'échéance: {$invoice['due_date']}</p>
            <p>Merci de votre confiance.</p>
            <p>Cordialement,<br>L'équipe ChecksFleet</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}
