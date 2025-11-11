/**
 * 📄 Page Publique de Rapport d'Inspection - VERSION PREMIUM REDESIGNÉE
 * 
 * Fonctionnalités:
 * - Affichage complet des informations de mission
 * - Photos consultables et téléchargeables (ZIP)
 * - Signatures visibles
 * - Impression et export PDF optimisés
 * - Design professionnel et responsive
 */

// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText, Calendar, Car, MapPin, User, Phone, Clock, Gauge,
  Fuel, Download, Printer, Archive, X, ChevronLeft, ChevronRight,
  Navigation, Package, CheckCircle, XCircle, FileSignature, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Helpers d'affichage (carburant % et propreté en texte)
const CLEANLINESS_MAP: Record<number, string> = {
  1: 'très sale',
  2: 'sale',
  3: 'correct',
  4: 'propre',
  5: 'très propre',
};

function formatFuelPercent(value: any): string {
  const num = typeof value === 'number' ? value : parseInt(value);
  return isNaN(num) ? 'N/A' : `${num}%`;
}

function formatCleanliness(inspection: any, type: 'internal' | 'external'): string {
  const textValue = type === 'internal' ? inspection?.internal_cleanliness : inspection?.external_cleanliness;
  if (textValue && typeof textValue === 'string') {
    return textValue.charAt(0).toUpperCase() + textValue.slice(1);
  }
  const rating = type === 'internal' ? inspection?.cleanliness_interior : inspection?.cleanliness_exterior;
  if (rating !== null && rating !== undefined) {
    const mapped = CLEANLINESS_MAP[Number(rating) as 1|2|3|4|5];
    return mapped || String(rating);
  }
  return 'N/A';
}

export default function PublicInspectionReportShared() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentPhotos, setCurrentPhotos] = useState<any[]>([]);

  useEffect(() => {
    if (token) loadReport();
  }, [token]);

  const loadReport = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_full_inspection_report', { p_token: token });
      if (rpcError) throw rpcError;
      if (!data || data.error) throw new Error(data?.error || 'Rapport non trouvé');

      setReportData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPhoto = (photos: any[], index: number) => {
    setCurrentPhotos(photos);
    setPhotoIndex(index);
    setSelectedPhoto(photos[index]?.url || photos[index]?.photo_url);
  };

  const closePhoto = () => setSelectedPhoto(null);

  const nextPhoto = () => {
    if (photoIndex < currentPhotos.length - 1) {
      const newIndex = photoIndex + 1;
      setPhotoIndex(newIndex);
      setSelectedPhoto(currentPhotos[newIndex]?.url || currentPhotos[newIndex]?.photo_url);
    }
  };

  const prevPhoto = () => {
    if (photoIndex > 0) {
      const newIndex = photoIndex - 1;
      setPhotoIndex(newIndex);
      setSelectedPhoto(currentPhotos[newIndex]?.url || currentPhotos[newIndex]?.photo_url);
    }
  };

  const downloadAllPhotos = async () => {
    try {
      toast.info('Préparation du téléchargement complet...');
      const zip = new JSZip();
      
      // Ajouter les photos
      const addPhotosToZip = async (photos: any[], folderName: string) => {
        if (!photos?.length) return;
        const folder = zip.folder(folderName);
        for (let i = 0; i < photos.length; i++) {
          const url = photos[i]?.url || photos[i]?.photo_url;
          if (url) {
            const response = await fetch(url);
            const blob = await response.blob();
            folder?.file(`photo_${i + 1}.jpg`, blob);
          }
        }
      };

      await addPhotosToZip(reportData.inspection_departure?.photos, 'Photos_Depart');
      await addPhotosToZip(reportData.inspection_arrival?.photos, 'Photos_Arrivee');
      
      // Générer et ajouter le PDF
      try {
        toast.info('Génération du PDF...');
        const { generatePremiumInspectionPDF } = await import('../services/inspectionPdfPremiumService');
        
        // Générer le PDF en blob
        const pdfBlob = await generatePremiumInspectionPDF({
          mission: reportData.mission_data,
          departure: reportData.inspection_departure,
          arrival: reportData.inspection_arrival,
          reportType: reportData.report_type
        }, true); // true = retourner le blob au lieu de télécharger
        
        if (pdfBlob) {
          zip.file(`Rapport_Inspection_${reportData.mission_data?.reference || 'rapport'}.pdf`, pdfBlob);
        }
      } catch (pdfError) {
        console.error('Erreur génération PDF:', pdfError);
        // Continuer même si le PDF échoue
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Inspection_Complete_${reportData.mission_data?.reference || 'rapport'}.zip`);
      toast.success('Archive complète téléchargée !');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600">{error || 'Ce rapport n\'existe pas ou a expiré'}</p>
        </div>
      </div>
    );
  }

  const mission = reportData.mission_data;
  const vehicle = reportData.vehicle_data;
  const departure = reportData.inspection_departure;
  const arrival = reportData.inspection_arrival;

  // Calculer les métriques
  const kmParcouru = departure?.mileage_km && arrival?.mileage_km ? arrival.mileage_km - departure.mileage_km : 0;
  const tempsLivraison = departure?.created_at && arrival?.created_at 
    ? Math.round((new Date(arrival.created_at).getTime() - new Date(departure.created_at).getTime()) / (1000 * 60 * 60))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:py-0">
      <div className="max-w-6xl mx-auto px-4 print:px-0">
        
        {/* HEADER PREMIUM */}
        <div className="bg-white rounded-xl shadow-lg mb-6 print:shadow-none print:border print:border-gray-300">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-t-xl text-white print:bg-blue-600">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Rapport d'Inspection Véhicule</h1>
                <p className="text-blue-100">Mission: {mission?.reference || 'N/A'}</p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition">
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={downloadAllPhotos} className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition">
                  <Archive className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Véhicule */}
              <InfoCard
                icon={Car}
                title="Véhicule Convoyé"
                items={[
                  { label: 'Marque/Modèle', value: `${vehicle?.brand || 'N/A'} ${vehicle?.model || ''}` },
                  { label: 'Plaque', value: vehicle?.plate || 'N/A' },
                  { label: 'Type', value: mission?.vehicle_type || 'N/A' },
                  { label: 'Couleur', value: vehicle?.color || 'N/A' },
                ]}
              />

              {/* Départ */}
              <InfoCard
                icon={Navigation}
                title="Point de Départ"
                items={[
                  { label: 'Adresse', value: mission?.pickup_address || 'N/A' },
                  { label: 'Contact', value: mission?.pickup_contact_name || 'N/A' },
                  { label: 'Téléphone', value: mission?.pickup_contact_phone || 'N/A' },
                  { label: 'Date/Heure', value: departure?.created_at ? new Date(departure.created_at).toLocaleString('fr-FR') : 'N/A' },
                ]}
              />

              {/* Arrivée */}
              <InfoCard
                icon={MapPin}
                title="Point d'Arrivée"
                items={[
                  { label: 'Adresse', value: mission?.delivery_address || 'N/A' },
                  { label: 'Contact', value: mission?.delivery_contact_name || 'N/A' },
                  { label: 'Téléphone', value: mission?.delivery_contact_phone || 'N/A' },
                  { label: 'Date/Heure', value: arrival?.created_at ? new Date(arrival.created_at).toLocaleString('fr-FR') : 'N/A' },
                ]}
              />
            </div>

            {/* Métriques de transport */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-6 bg-gray-50 rounded-lg">
              <MetricBox icon={User} label="Convoyeur" value={mission?.driver_name || 'N/A'} />
              <MetricBox icon={Gauge} label="KM Parcourus" value={kmParcouru > 0 ? `${kmParcouru} km` : 'N/A'} />
              <MetricBox icon={Clock} label="Temps Livraison" value={tempsLivraison > 0 ? `${tempsLivraison}h` : 'N/A'} />
              <MetricBox icon={Phone} label="Contact Driver" value={mission?.driver_phone || 'N/A'} />
            </div>
          </div>
        </div>

        {/* INSPECTION DÉPART */}
        {departure && (
          <InspectionCard
            title="Inspection au Départ"
            inspection={departure}
            color="green"
            onOpenPhoto={openPhoto}
          />
        )}

        {/* INSPECTION ARRIVÉE */}
        {arrival && (
          <InspectionCard
            title="Inspection à l'Arrivée"
            inspection={arrival}
            color="blue"
            onOpenPhoto={openPhoto}
          />
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8 print:mt-4">
          <p>Document généré par xCrackz - Transport & Convoyage Professionnel</p>
          <p className="mt-1">Rapport authentique et sécurisé • {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* MODAL PHOTO */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closePhoto}>
          <button onClick={closePhoto} className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-lg">
            <X className="w-6 h-6" />
          </button>
          
          {photoIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} 
              className="absolute left-4 text-white hover:bg-white/20 p-3 rounded-lg">
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          <img src={selectedPhoto} alt="Photo" className="max-h-[90vh] max-w-[90vw] object-contain" 
            onClick={(e) => e.stopPropagation()} />
          
          {photoIndex < currentPhotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} 
              className="absolute right-4 text-white hover:bg-white/20 p-3 rounded-lg">
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
            {photoIndex + 1} / {currentPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}

// COMPOSANTS UTILITAIRES

function InfoCard({ icon: Icon, title, items }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4 text-gray-700">
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="text-sm">
            <span className="text-gray-500">{item.label}:</span>{' '}
            <span className="text-gray-900 font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value }: any) {
  return (
    <div className="text-center">
      <Icon className="w-6 h-6 mx-auto mb-2 text-blue-600" />
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

function InspectionCard({ title, inspection, color, onOpenPhoto }: any) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600 border-green-200',
    blue: 'from-blue-500 to-indigo-600 border-blue-200',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden print:shadow-none print:border print:border-gray-300 print:break-inside-avoid">
      <div className={`bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} p-6 text-white print:bg-${color}-600`}>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-white/80 text-sm mt-1">
          {inspection.created_at ? new Date(inspection.created_at).toLocaleString('fr-FR') : 'N/A'}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* État Véhicule */}
        <Section title="État du Véhicule" icon={Gauge}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem 
              label="Kilométrage" 
              value={inspection.mileage_km ? `${inspection.mileage_km.toLocaleString()} km` : 'N/A'} 
            />
            <StatItem 
              label="Carburant" 
              value={formatFuelPercent(inspection.fuel_level)} 
            />
            <StatItem 
              label="Propreté Int." 
              value={formatCleanliness(inspection, 'internal')} 
            />
            <StatItem 
              label="Propreté Ext." 
              value={formatCleanliness(inspection, 'external')} 
            />
          </div>
        </Section>

        {/* Documents */}
        <Section title="Documents" icon={FileText}>
          <div className="grid grid-cols-3 gap-3">
            <Badge label="Carte Grise" checked={inspection.has_registration} />
            <Badge label="Assurance" checked={inspection.has_insurance} />
            <Badge label="Documents" checked={inspection.has_vehicle_documents} />
          </div>
        </Section>

        {/* Équipements */}
        <Section title="Équipements de Sécurité" icon={Package}>
          <div className="grid grid-cols-3 gap-3">
            <Badge label="Roue secours" checked={inspection.has_spare_wheel} />
            <Badge label="Cric" checked={inspection.has_jack} />
            <Badge label="Triangle" checked={inspection.has_warning_triangle} />
            <Badge label="Trousse secours" checked={inspection.has_first_aid_kit} />
            <Badge label="Extincteur" checked={inspection.has_fire_extinguisher} />
          </div>
        </Section>

        {/* Photos */}
        {inspection.photos && inspection.photos.length > 0 && (
          <Section title={`Photos (${inspection.photos.length})`} icon={ImageIcon}>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {inspection.photos.map((photo: any, i: number) => (
                <div key={i} onClick={() => onOpenPhoto(inspection.photos, i)}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-4 ring-blue-500 transition print:break-inside-avoid">
                  <img src={photo.url || photo.photo_url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Signatures */}
        <Section title="Signatures" icon={FileSignature}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SignatureBox
              title={title.includes('Départ') ? 'Convoyeur (Départ)' : 'Convoyeur (Arrivée)'}
              signature={inspection.driver_signature}
              name={inspection.driver_name || inspection.driverName}
            />
            <SignatureBox
              title={title.includes('Départ') ? 'Expéditeur' : 'Réceptionnaire'}
              signature={inspection.client_signature}
              name={inspection.client_name || inspection.clientName}
            />
          </div>
        </Section>

        {/* Documents scannés */}
        {inspection.scanned_documents && inspection.scanned_documents.length > 0 && (
          <Section title={`Documents scannés (${inspection.scanned_documents.length})`} icon={FileText}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {inspection.scanned_documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-gray-200 rounded-lg p-3 flex flex-col gap-2 hover:border-blue-500 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-700 truncate" title={doc.title || 'Document'}>
                      {doc.title || 'Document'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{(doc.mime_type || '').split('/')[1] || 'fichier'}</span>
                    {doc.created_at && (
                      <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        {/* Frais / Dépenses */}
        {inspection.expenses && inspection.expenses.length > 0 && (
          <Section title={`Frais & Dépenses (${inspection.expenses.length})`} icon={Package}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="text-left font-semibold px-3 py-2">Libellé</th>
                    <th className="text-left font-semibold px-3 py-2">Catégorie</th>
                    <th className="text-right font-semibold px-3 py-2">Montant</th>
                    <th className="text-left font-semibold px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.expenses.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-800">{exp.description || exp.label || 'Frais'}</td>
                      <td className="px-3 py-2 text-gray-500">{exp.expense_type || exp.category || '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{Number(exp.amount || 0).toFixed(2)} €</td>
                      <td className="px-3 py-2 text-gray-500">
                        {exp.created_at ? new Date(exp.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Observations */}
        {inspection.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:break-inside-avoid">
            <h4 className="font-semibold text-amber-900 mb-2">📝 Observations</h4>
            <p className="text-amber-800 whitespace-pre-wrap text-sm">{inspection.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-3 text-gray-700">
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatItem({ label, value }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Badge({ label, checked }: any) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
      checked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {checked ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      <span>{label}</span>
    </div>
  );
}

function SignatureBox({ title, signature, name }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="bg-gray-50 rounded border border-gray-200 p-2 h-32 flex items-center justify-center">
        {signature ? (
          <img src={signature} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-gray-400 text-sm">Non signée</span>
        )}
      </div>
      {name && (
        <div className="mt-2 text-xs text-gray-500">Signé par: <span className="font-medium text-gray-700">{name}</span></div>
      )}
    </div>
  );
}
