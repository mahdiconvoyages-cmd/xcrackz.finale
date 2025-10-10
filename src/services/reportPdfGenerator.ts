interface InspectionData {
  id: string;
  type: 'pickup' | 'delivery';
  date: string;
  missionRef: string;
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  };
  location: {
    pickup: string;
    delivery: string;
  };
  condition: {
    overall: string;
    mileage: number;
    fuelLevel: number;
    hasDamages: boolean;
    damageDescription?: string;
  };
  notes?: string;
  inspector: {
    name: string;
    company?: string;
  };
  photos?: {
    photo_url: string;
    photo_type: string;
    description?: string;
  }[];
}

function formatPhotoType(photoType: string): string {
  const typeMap: { [key: string]: string } = {
    'front': 'Vue de face',
    'back': 'Vue arrière',
    'left_side': 'Côté gauche',
    'right_side': 'Côté droit',
    'interior': 'Intérieur',
    'dashboard': 'Tableau de bord',
    'arrival_front': 'Vue de face (arrivée)',
    'arrival_back': 'Vue arrière (arrivée)',
    'arrival_left': 'Côté gauche (arrivée)',
    'arrival_right': 'Côté droit (arrivée)',
    'arrival_interior': 'Intérieur (arrivée)',
    'arrival_dashboard': 'Tableau de bord (arrivée)',
  };
  return typeMap[photoType] || photoType;
}

export function generateInspectionReportHTML(data: InspectionData): string {
  const typeLabel = data.type === 'pickup' ? 'PRISE EN CHARGE' : 'LIVRAISON';
  const typeColor = data.type === 'pickup' ? '#10b981' : '#f59e0b';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport d'inspection ${data.missionRef}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background: #fff;
      padding: 40px;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 25px;
      border-bottom: 3px solid ${typeColor};
    }

    .header-left h1 {
      font-size: 36px;
      font-weight: 800;
      color: ${typeColor};
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .header-left p {
      font-size: 16px;
      color: #64748b;
      font-weight: 600;
    }

    .header-right {
      text-align: right;
    }

    .logo {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }

    .date {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
    }

    .section {
      margin-bottom: 30px;
      padding: 25px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title::before {
      content: '';
      width: 4px;
      height: 24px;
      background: ${typeColor};
      border-radius: 2px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
    }

    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-excellent {
      background: #d1fae5;
      color: #065f46;
    }

    .status-good {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-fair {
      background: #fef3c7;
      color: #92400e;
    }

    .status-poor {
      background: #fee2e2;
      color: #991b1b;
    }

    .damage-alert {
      padding: 20px;
      background: #fef2f2;
      border: 2px solid #fca5a5;
      border-radius: 12px;
      margin-top: 15px;
    }

    .damage-alert-title {
      font-size: 14px;
      font-weight: 700;
      color: #991b1b;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .damage-alert-title::before {
      content: '⚠️';
      font-size: 20px;
    }

    .damage-description {
      font-size: 14px;
      color: #7f1d1d;
      line-height: 1.8;
    }

    .notes-box {
      padding: 20px;
      background: #fffbeb;
      border: 2px solid #fcd34d;
      border-radius: 12px;
      margin-top: 15px;
    }

    .notes-title {
      font-size: 14px;
      font-weight: 700;
      color: #78350f;
      margin-bottom: 8px;
    }

    .notes-content {
      font-size: 14px;
      color: #92400e;
      line-height: 1.8;
      white-space: pre-line;
    }

    .fuel-gauge {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
    }

    .fuel-bar {
      flex: 1;
      height: 24px;
      background: #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }

    .fuel-fill {
      height: 100%;
      background: linear-gradient(90deg, #14b8a6 0%, #06b6d4 100%);
      border-radius: 12px;
      transition: width 0.3s;
    }

    .fuel-label {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      min-width: 50px;
    }

    .footer {
      margin-top: 50px;
      padding-top: 25px;
      border-top: 2px solid #f1f5f9;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.8;
    }

    .signature-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px dashed #cbd5e1;
    }

    .signature-box {
      padding: 30px;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      text-align: center;
    }

    .signature-label {
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 15px;
    }

    .signature-line {
      width: 300px;
      height: 2px;
      background: #cbd5e1;
      margin: 0 auto;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }

    .photo-item {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }

    .photo-item img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      display: block;
    }

    .photo-caption {
      padding: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      background: #f8fafc;
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
      .photo-item img {
        max-height: 200px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <h1>${typeLabel}</h1>
        <p>Mission ${data.missionRef}</p>
      </div>
      <div class="header-right">
        <div class="logo">xcrackz</div>
        <div class="date">
          ${new Date(data.date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Informations du véhicule</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Marque & Modèle</div>
          <div class="info-value">${data.vehicle.brand} ${data.vehicle.model}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Immatriculation</div>
          <div class="info-value">${data.vehicle.plate}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Lieu de prise en charge</div>
          <div class="info-value">${data.location.pickup}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Lieu de livraison</div>
          <div class="info-value">${data.location.delivery}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">État du véhicule</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">État général</div>
          <div class="info-value">
            <span class="status-badge status-${(data.condition.overall || 'unknown').toLowerCase()}">
              ${data.condition.overall || 'Non renseigné'}
            </span>
          </div>
        </div>
        <div class="info-item">
          <div class="info-label">Kilométrage</div>
          <div class="info-value">${data.condition.mileage.toLocaleString('fr-FR')} km</div>
        </div>
      </div>

      <div style="margin-top: 20px;">
        <div class="info-label" style="margin-bottom: 10px;">Niveau de carburant</div>
        <div class="fuel-gauge">
          <div class="fuel-bar">
            <div class="fuel-fill" style="width: ${data.condition.fuelLevel}%"></div>
          </div>
          <div class="fuel-label">${data.condition.fuelLevel}%</div>
        </div>
      </div>

      ${data.condition.hasDamages ? `
        <div class="damage-alert">
          <div class="damage-alert-title">Dommages constatés</div>
          <div class="damage-description">${data.condition.damageDescription || 'Voir détails ci-joint'}</div>
        </div>
      ` : `
        <div style="margin-top: 20px; padding: 15px; background: #d1fae5; border-radius: 8px; text-align: center;">
          <span style="font-size: 14px; font-weight: 700; color: #065f46;">✓ Aucun dommage constaté</span>
        </div>
      `}

      ${data.notes ? `
        <div class="notes-box">
          <div class="notes-title">📝 Notes supplémentaires</div>
          <div class="notes-content">${data.notes}</div>
        </div>
      ` : ''}
    </div>

    ${data.photos && data.photos.length > 0 ? `
    <div class="section">
      <div class="section-title">Photos d'inspection</div>
      <div class="photos-grid">
        ${data.photos.map(photo => `
          <div class="photo-item">
            <img src="${photo.photo_url}" alt="${photo.photo_type}" onerror="this.style.display='none'; this.nextElementSibling.textContent='Image non disponible';">
            <div class="photo-caption">${formatPhotoType(photo.photo_type)}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Inspecteur</div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nom</div>
          <div class="info-value">${data.inspector.name}</div>
        </div>
        ${data.inspector.company ? `
        <div class="info-item">
          <div class="info-label">Entreprise</div>
          <div class="info-value">${data.inspector.company}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-label">Signature de l'inspecteur</div>
        <div class="signature-line"></div>
      </div>
    </div>

    <div class="footer">
      Ce rapport d'inspection a été généré automatiquement par xcrackz<br>
      Document confidentiel - ${new Date().toLocaleDateString('fr-FR')}
    </div>
  </div>
</body>
</html>
  `;
}

export async function downloadInspectionPDF(html: string, filename: string): Promise<void> {
  // Créer un iframe caché pour l'impression
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position: absolute; width: 0; height: 0; border: none;';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    iframe.remove();
    throw new Error('Impossible de créer l\'iframe d\'impression');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Attendre que le contenu soit chargé puis imprimer
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Nettoyer l'iframe après l'impression
        setTimeout(() => iframe.remove(), 1000);
      } catch (error) {
        console.error('Erreur lors de l\'impression:', error);
        iframe.remove();
      }
    }, 250);
  };
}

export function previewInspectionPDF(html: string): void {
  // Créer un modal de prévisualisation dans la page actuelle
  const modalId = 'pdf-preview-modal';

  // Supprimer le modal existant s'il existe
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  // Créer le nouveau modal
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    max-width: 900px;
    max-height: 90vh;
    border: none;
    border-radius: 12px;
    background: white;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '✕';
  closeButton.style.cssText = `
    position: absolute;
    top: 30px;
    right: 30px;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: white;
    color: #1e293b;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
    z-index: 10000;
  `;

  closeButton.onmouseover = () => {
    closeButton.style.background = '#f1f5f9';
    closeButton.style.transform = 'scale(1.1)';
  };

  closeButton.onmouseout = () => {
    closeButton.style.background = 'white';
    closeButton.style.transform = 'scale(1)';
  };

  closeButton.onclick = () => modal.remove();

  // Fermer en cliquant sur le fond
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };

  modal.appendChild(iframe);
  modal.appendChild(closeButton);
  document.body.appendChild(modal);

  // Écrire le HTML dans l'iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
  }
}
