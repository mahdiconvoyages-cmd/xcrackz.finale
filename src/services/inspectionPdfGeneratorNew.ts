/**
 * Service de génération PDF amélioré pour rapports d'inspection
 * 
 * CHANGEMENTS:
 * - ❌ PAS d'images intégrées dans le PDF (uniquement liens consultables)
 * - ✅ Descriptions IA Gemini complètes
 * - ✅ Récapitulatif IA final
 * - ✅ Toutes les infos: véhicule, adresses, heures, signatures, checklist
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// GEMINI API CONFIG
// ==========================================
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// ==========================================
// INTERFACES
// ==========================================
interface InspectionPhoto {
  id: string;
  photo_type: string;
  photo_url: string;
  ai_description?: string; // Description IA si disponible
  created_at: string;
}

interface ChecklistItem {
  category: string;
  item: string;
  status: 'ok' | 'damaged' | 'missing' | 'na';
  notes?: string;
}

interface VehicleInspection {
  id: string;
  inspection_type: 'departure' | 'arrival';
  overall_condition: string;
  fuel_level: number;
  mileage_km: number;
  notes: string;
  signature_url: string | null;
  checklist?: ChecklistItem[];
  completed_at: string;
  created_at: string;
}

interface MissionData {
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_vin: string;
  pickup_address: string;
  delivery_address: string;
  pickup_time?: string;
  delivery_time?: string;
}

// ==========================================
// UTILITAIRES
// ==========================================

const getConditionLabel = (condition: string) => {
  switch (condition) {
    case 'excellent': return 'Excellent ⭐⭐⭐⭐⭐';
    case 'good': return 'Bon ⭐⭐⭐⭐';
    case 'fair': return 'Moyen ⭐⭐⭐';
    case 'poor': return 'Mauvais ⭐⭐';
    default: return condition;
  }
};

const getPhotoTypeLabel = (type: string) => {
  switch (type) {
    case 'front': return 'Vue avant';
    case 'back': return 'Vue arrière';
    case 'left_side': return 'Côté gauche';
    case 'right_side': return 'Côté droit';
    case 'interior': return 'Intérieur';
    case 'dashboard': return 'Tableau de bord';
    case 'damage': return 'Dommage détecté';
    case 'other': return 'Autre';
    default: return type;
  }
};

const getChecklistStatusIcon = (status: string) => {
  switch (status) {
    case 'ok': return '✓';
    case 'damaged': return '✗';
    case 'missing': return '⊗';
    case 'na': return '-';
    default: return '?';
  }
};

const getChecklistStatusLabel = (status: string) => {
  switch (status) {
    case 'ok': return 'OK';
    case 'damaged': return 'Endommagé';
    case 'missing': return 'Manquant';
    case 'na': return 'N/A';
    default: return status;
  }
};

// ==========================================
// GÉNÉRATION DESCRIPTIONS IA (GEMINI)
// ==========================================

/**
 * Génère une description IA pour une photo via Gemini
 */
async function generatePhotoDescription(photoUrl: string, photoType: string): Promise<string> {
  try {
    // Charger l'image en base64
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Enlever le préfixe data:image/...
      };
      reader.readAsDataURL(blob);
    });

    const prompt = `Tu es un expert en inspection automobile. Analyse cette photo de véhicule (vue: ${photoType}).

Décris en français, en 2-3 phrases maximum :
1. L'état général visible
2. Les dommages ou anomalies (si présents)
3. Les points d'attention

Sois précis et factuel. Si aucun dommage visible, indique "Aucun dommage apparent".`;

    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      }
    };

    const apiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      console.error('Gemini API error:', apiResponse.status);
      return 'Description IA non disponible';
    }

    const data = await apiResponse.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return aiText || 'Description IA non disponible';
  } catch (error) {
    console.error('Erreur génération description IA:', error);
    return 'Description IA non disponible';
  }
}

/**
 * Génère un récapitulatif IA complet de l'inspection
 */
async function generateInspectionSummary(
  mission: MissionData,
  departureInspection: VehicleInspection | null,
  arrivalInspection: VehicleInspection | null
): Promise<string> {
  try {
    const inspectionData = {
      vehicule: `${mission.vehicle_brand} ${mission.vehicle_model} (${mission.vehicle_plate})`,
      depart: departureInspection ? {
        etat: departureInspection.overall_condition,
        carburant: `${departureInspection.fuel_level}%`,
        kilometrage: `${departureInspection.mileage_km} km`,
        notes: departureInspection.notes,
        checklist: departureInspection.checklist
      } : null,
      arrivee: arrivalInspection ? {
        etat: arrivalInspection.overall_condition,
        carburant: `${arrivalInspection.fuel_level}%`,
        kilometrage: `${arrivalInspection.mileage_km} km`,
        notes: arrivalInspection.notes,
        checklist: arrivalInspection.checklist
      } : null
    };

    const prompt = `Tu es un expert en inspection automobile. Analyse ce rapport d'inspection et génère un récapitulatif structuré.

DONNÉES D'INSPECTION:
${JSON.stringify(inspectionData, null, 2)}

Génère un récapitulatif en français avec:

1. ÉTAT GÉNÉRAL (2 phrases max)
   - Résumé de l'état du véhicule entre départ et arrivée
   - Changements notables (carburant, kilométrage, condition)

2. POINTS D'ATTENTION (liste à puces)
   - Dommages ou anomalies détectés
   - Éléments manquants ou endommagés
   - Si aucun: "Aucun point d'attention particulier"

3. RECOMMANDATIONS (liste à puces)
   - Actions suggérées (réparations, vérifications)
   - Si aucun problème: "Véhicule en bon état, aucune action requise"

Format: Texte clair, concis, professionnel. Maximum 200 mots.`;

    const requestBody = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return 'Récapitulatif IA non disponible';
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return summary || 'Récapitulatif IA non disponible';
  } catch (error) {
    console.error('Erreur génération récapitulatif IA:', error);
    return 'Récapitulatif IA non disponible';
  }
}

// ==========================================
// GÉNÉRATION PDF PRINCIPAL
// ==========================================

export const generateInspectionPDFNew = async (
  mission: MissionData,
  departureInspection: VehicleInspection | null,
  arrivalInspection: VehicleInspection | null,
  departurePhotos: InspectionPhoto[],
  arrivalPhotos: InspectionPhoto[]
) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // ==========================================
  // PAGE 1: EN-TÊTE + INFOS VÉHICULE
  // ==========================================

  doc.setFontSize(24);
  doc.setTextColor(20, 184, 166);
  doc.text('RAPPORT D\'INSPECTION', 105, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('État des lieux véhicule', 105, yPosition, { align: 'center' });

  yPosition += 4;
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 105, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setDrawColor(20, 184, 166);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;

  // INFOS VÉHICULE
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('📋 INFORMATIONS VÉHICULE', 20, yPosition);
  yPosition += 8;

  const vehicleInfo = [
    ['Référence mission', mission.reference],
    ['Marque / Modèle', `${mission.vehicle_brand} ${mission.vehicle_model}`],
    ['Plaque d\'immatriculation', mission.vehicle_plate],
    ['Numéro VIN', mission.vehicle_vin || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: vehicleInfo,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 65 },
      1: { cellWidth: 105 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // ADRESSES
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('📍 ITINÉRAIRE', 20, yPosition);
  yPosition += 8;

  const addresses = [
    ['Départ', mission.pickup_address, mission.pickup_time || 'N/A'],
    ['Arrivée', mission.delivery_address, mission.delivery_time || 'N/A'],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Type', 'Adresse', 'Heure']],
    body: addresses,
    theme: 'striped',
    headStyles: { fillColor: [20, 184, 166], fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 110 },
      2: { cellWidth: 35 },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ==========================================
  // PAGE 2: INSPECTION DÉPART
  // ==========================================

  if (departureInspection) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(20, 184, 166);
    doc.text('🚗 INSPECTION DÉPART', 105, yPosition, { align: 'center' });

    yPosition += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const departureDate = new Date(departureInspection.completed_at || departureInspection.created_at);
    doc.text(
      `Effectuée le ${departureDate.toLocaleString('fr-FR')}`,
      105,
      yPosition,
      { align: 'center' }
    );

    yPosition += 8;
    doc.setDrawColor(20, 184, 166);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    // ÉTAT GÉNÉRAL
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 ÉTAT GÉNÉRAL', 20, yPosition);
    yPosition += 8;

    const departureData = [
      ['État général', getConditionLabel(departureInspection.overall_condition)],
      ['Niveau de carburant', `${departureInspection.fuel_level}%`],
      ['Kilométrage', `${(departureInspection.mileage_km || 0).toLocaleString()} km`],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: departureData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 65 },
        1: { cellWidth: 105 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // CHECKLIST
    if (departureInspection.checklist && departureInspection.checklist.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('✓ CHECKLIST', 20, yPosition);
      yPosition += 8;

      const checklistData = departureInspection.checklist.map(item => [
        getChecklistStatusIcon(item.status),
        item.category,
        item.item,
        getChecklistStatusLabel(item.status),
        item.notes || '-'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['', 'Catégorie', 'Élément', 'État', 'Notes']],
        body: checklistData,
        theme: 'grid',
        headStyles: { fillColor: [20, 184, 166], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 30 },
          4: { cellWidth: 50 },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // OBSERVATIONS
    if (departureInspection.notes) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('📝 OBSERVATIONS', 20, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const splitNotes = doc.splitTextToSize(departureInspection.notes, 170);
      doc.text(splitNotes, 20, yPosition);
      yPosition += splitNotes.length * 5 + 10;
    }

    // PHOTOS - UNIQUEMENT LIENS (pas d'images intégrées)
    if (departurePhotos.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('📸 PHOTOGRAPHIES DÉPART', 20, yPosition);
      yPosition += 4;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text(`${departurePhotos.length} photo(s) disponible(s) - Consultables via liens ci-dessous`, 20, yPosition);
      yPosition += 10;

      // Générer descriptions IA pour chaque photo
      const photoDescriptions = await Promise.all(
        departurePhotos.map(async (photo) => {
          const description = photo.ai_description || await generatePhotoDescription(photo.photo_url, photo.photo_type);
          return [
            getPhotoTypeLabel(photo.photo_type),
            description,
            photo.photo_url.length > 50 ? photo.photo_url.substring(0, 47) + '...' : photo.photo_url
          ];
        })
      );

      autoTable(doc, {
        startY: yPosition,
        head: [['Type', 'Description IA', 'Lien photo']],
        body: photoDescriptions,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 90 },
          2: { cellWidth: 50, textColor: [59, 130, 246], fontStyle: 'italic' },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // SIGNATURE DÉPART
    if (departureInspection.signature_url) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('✍️ SIGNATURE CLIENT (DÉPART)', 20, yPosition);
      yPosition += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(59, 130, 246);
      doc.text(`Signature disponible: ${departureInspection.signature_url}`, 20, yPosition);
    }
  }

  // ==========================================
  // PAGE 3: INSPECTION ARRIVÉE
  // ==========================================

  if (arrivalInspection) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(18);
    doc.setTextColor(239, 68, 68);
    doc.text('🏁 INSPECTION ARRIVÉE', 105, yPosition, { align: 'center' });

    yPosition += 6;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const arrivalDate = new Date(arrivalInspection.completed_at || arrivalInspection.created_at);
    doc.text(
      `Effectuée le ${arrivalDate.toLocaleString('fr-FR')}`,
      105,
      yPosition,
      { align: 'center' }
    );

    yPosition += 8;
    doc.setDrawColor(239, 68, 68);
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    // ÉTAT GÉNÉRAL
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 ÉTAT GÉNÉRAL', 20, yPosition);
    yPosition += 8;

    const arrivalData = [
      ['État général', getConditionLabel(arrivalInspection.overall_condition)],
      ['Niveau de carburant', `${arrivalInspection.fuel_level}%`],
      ['Kilométrage', `${(arrivalInspection.mileage_km || 0).toLocaleString()} km`],
    ];

    // Calcul distance parcourue
    if (departureInspection && arrivalInspection.mileage_km && departureInspection.mileage_km) {
      const distance = arrivalInspection.mileage_km - departureInspection.mileage_km;
      arrivalData.push(['Distance parcourue', `${distance.toLocaleString()} km`]);
    }

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: arrivalData,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 65 },
        1: { cellWidth: 105 },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // CHECKLIST
    if (arrivalInspection.checklist && arrivalInspection.checklist.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('✓ CHECKLIST', 20, yPosition);
      yPosition += 8;

      const checklistData = arrivalInspection.checklist.map(item => [
        getChecklistStatusIcon(item.status),
        item.category,
        item.item,
        getChecklistStatusLabel(item.status),
        item.notes || '-'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['', 'Catégorie', 'Élément', 'État', 'Notes']],
        body: checklistData,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold' },
          2: { cellWidth: 45 },
          3: { cellWidth: 30 },
          4: { cellWidth: 50 },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // OBSERVATIONS
    if (arrivalInspection.notes) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('📝 OBSERVATIONS', 20, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const splitNotes = doc.splitTextToSize(arrivalInspection.notes, 170);
      doc.text(splitNotes, 20, yPosition);
      yPosition += splitNotes.length * 5 + 10;
    }

    // PHOTOS ARRIVÉE
    if (arrivalPhotos.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('📸 PHOTOGRAPHIES ARRIVÉE', 20, yPosition);
      yPosition += 4;
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      doc.text(`${arrivalPhotos.length} photo(s) disponible(s) - Consultables via liens ci-dessous`, 20, yPosition);
      yPosition += 10;

      // Générer descriptions IA
      const photoDescriptions = await Promise.all(
        arrivalPhotos.map(async (photo) => {
          const description = photo.ai_description || await generatePhotoDescription(photo.photo_url, photo.photo_type);
          return [
            getPhotoTypeLabel(photo.photo_type),
            description,
            photo.photo_url.length > 50 ? photo.photo_url.substring(0, 47) + '...' : photo.photo_url
          ];
        })
      );

      autoTable(doc, {
        startY: yPosition,
        head: [['Type', 'Description IA', 'Lien photo']],
        body: photoDescriptions,
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold' },
          1: { cellWidth: 90 },
          2: { cellWidth: 50, textColor: [59, 130, 246], fontStyle: 'italic' },
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // SIGNATURE ARRIVÉE
    if (arrivalInspection.signature_url) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('✍️ SIGNATURE CLIENT (ARRIVÉE)', 20, yPosition);
      yPosition += 4;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(59, 130, 246);
      doc.text(`Signature disponible: ${arrivalInspection.signature_url}`, 20, yPosition);
    }
  }

  // ==========================================
  // PAGE FINALE: RÉCAPITULATIF IA
  // ==========================================

  doc.addPage();
  yPosition = 20;

  doc.setFontSize(18);
  doc.setTextColor(168, 85, 247);
  doc.text('🤖 RÉCAPITULATIF IA', 105, yPosition, { align: 'center' });

  yPosition += 6;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Analyse automatique générée par Gemini AI', 105, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setDrawColor(168, 85, 247);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 12;

  // Générer le récapitulatif IA
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.text('⏳ Génération du récapitulatif en cours...', 20, yPosition);

  const aiSummary = await generateInspectionSummary(mission, departureInspection, arrivalInspection);

  // Effacer "Génération en cours"
  doc.setTextColor(255, 255, 255);
  doc.rect(19, yPosition - 4, 171, 8, 'F');

  // Afficher le récapitulatif
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  const summaryLines = doc.splitTextToSize(aiSummary, 170);
  doc.text(summaryLines, 20, yPosition);

  yPosition += summaryLines.length * 5 + 15;

  // Note de fin
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  doc.text('─────────────────────────────────────────────────────────────────────', 105, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('Ce rapport a été généré automatiquement. Les photos sont consultables via les liens fournis.', 105, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text(`Document généré le ${new Date().toLocaleString('fr-FR')} - Powered by Gemini AI`, 105, yPosition, { align: 'center' });

  // ==========================================
  // RETOURNER LE PDF
  // ==========================================

  const filename = `Inspection_${mission.reference}_${new Date().toISOString().split('T')[0]}.pdf`;

  return {
    pdf: doc,
    filename,
    download: () => doc.save(filename),
    preview: () => {
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    }
  };
};

export default generateInspectionPDFNew;
