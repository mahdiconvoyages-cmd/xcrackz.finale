/**
 * Page Rapports d'Inspection - Version Moderne Unifiée
 * 
 * Design de Reports.tsx + Fonctionnalités de RapportsInspection.tsx
 * 
 * Fonctionnalités:
 * - Affichage progressif (départ → complet)
 * - Photos en grand format
 * - Téléchargement PDF/photos
 * - Envoi par email
 * - Stats visuelles (cards)
 * - Filtres de recherche
 * - Interface moderne avec backdrop-blur
 */

import { useState, useEffect } from 'react';
import { 
  FileText, Download, Mail, Image, ChevronDown, ChevronUp, X,
  Search, Filter, Calendar, Truck, CheckCircle, MapPin 
} from 'lucide-react';
import {
  listInspectionReports,
  generateInspectionPDF,
  downloadAllPhotos,
  type InspectionReport,
} from '../services/inspectionReportService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import OptimizedImage from '../components/OptimizedImage';

export default function RapportsInspection() {
  const { user } = useAuth();

  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalReport, setEmailModalReport] = useState<InspectionReport | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    setLoading(true);
    const result = await listInspectionReports(user.id);

    if (result.success) {
      setReports(result.reports);
    } else {
      toast.error(result.message || 'Erreur lors du chargement des rapports');
    }

    setLoading(false);
  };

  const toggleExpand = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  // Générer et télécharger le PDF
  const handleDownloadPDF = async (report: InspectionReport) => {
    try {
      setGeneratingPDF(true);
      toast.loading('Génération du PDF...', { id: 'pdf-gen' });

      const result = await generateInspectionPDF(report);

      if (result.success && result.url) {
        // Télécharger le fichier directement
        const a = document.createElement('a');
        a.href = result.url;
        a.download = `inspection-${report.mission_reference}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.success('PDF généré et téléchargé !', { id: 'pdf-gen' });
      } else {
        toast.error(result.message || 'Erreur lors de la génération du PDF', { id: 'pdf-gen' });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF', { id: 'pdf-gen' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Télécharger toutes les photos
  const handleDownloadPhotos = async (report: InspectionReport) => {
    try {
      toast.loading('Récupération des photos...', { id: 'photos-dl' });

      const result = await downloadAllPhotos(report);

      if (result.success) {
        if (result.urls && result.urls.length > 0) {
          // Télécharger chaque photo
          result.urls.forEach((url, index) => {
            const a = document.createElement('a');
            a.href = url;
            a.download = `photo-${report.mission_reference}-${index + 1}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
        }
        toast.success(`${result.urls.length} photo(s) chargée(s)`, { id: 'photos-dl' });
      } else {
        toast.error(result.message || 'Erreur lors du chargement des photos', { id: 'photos-dl' });
      }
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Erreur lors du téléchargement des photos', { id: 'photos-dl' });
    }
  };

  // Envoyer par email
  const openEmailModal = (report: InspectionReport) => {
    setEmailModalReport(report);
    setEmailAddress('');
  };

  const handleSendEmail = async () => {
    if (!emailModalReport) return;

    if (!emailAddress.trim()) {
      toast.error('Veuillez saisir une adresse email');
      return;
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      toast.error('Adresse email invalide');
      return;
    }

    try {
      setSendingEmail(true);

      // Préparer le message email
      const missionRef = emailModalReport.mission_reference || 'N/A';
      const vehicle = `${emailModalReport.vehicle_brand || ''} ${emailModalReport.vehicle_model || ''}`.trim() || 'Véhicule';
      const plate = emailModalReport.vehicle_plate || '';
      
      const subject = `État des lieux complet - ${missionRef} - ${vehicle}${plate ? ' (' + plate + ')' : ''}`;
      
      const body = `Bonjour,

Vous trouverez ci-joint l'état des lieux complet du véhicule ${vehicle}${plate ? ' (immatriculation : ' + plate + ')' : ''}.

📋 Mission : ${missionRef}
🚗 Véhicule : ${vehicle}
${plate ? '🔖 Immatriculation : ' + plate : ''}

${emailModalReport.is_complete ? '✅ Rapport complet (départ + arrivée)' : '⚠️ Rapport partiel'}

${emailModalReport.departure_inspection ? `
📸 État des lieux DÉPART :
   - Kilométrage : ${emailModalReport.departure_inspection.km_start || 'N/A'} km
   - Carburant : ${emailModalReport.departure_inspection.fuel_level_start || 'N/A'}
` : ''}

${emailModalReport.arrival_inspection ? `
📸 État des lieux ARRIVÉE :
   - Kilométrage : ${emailModalReport.arrival_inspection.km_end || 'N/A'} km
   - Carburant : ${emailModalReport.arrival_inspection.fuel_level_end || 'N/A'}
` : ''}

📄 Documents joints :
   • Rapport PDF complet avec photos
   • Photos d'inspection (départ + arrivée)

ℹ️ Note : Les photos et le PDF sont disponibles en téléchargement. Veuillez les joindre manuellement à cet email depuis l'interface.

Cordialement,
${user?.email || 'Finality Transport'}`;

      // Construire le mailto avec sujet et corps
      const mailtoLink = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Ouvrir le client email par défaut
      window.location.href = mailtoLink;

      toast.success('Client email ouvert ! N\'oubliez pas de joindre les photos et le PDF.', { duration: 5000 });
      
      // Fermer le modal après un court délai
      setTimeout(() => {
        setEmailModalReport(null);
        setEmailAddress('');
      }, 1000);

    } catch (error) {
      console.error('Error opening email client:', error);
      toast.error('Erreur lors de l\'ouverture du client email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Filtrage
  const filteredReports = reports.filter((report) => {
    const isDeparture = report.departure_inspection !== null;
    const isArrival = report.arrival_inspection !== null;

    const matchesSearch =
      report.mission_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.vehicle_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'departure' && isDeparture) ||
      (typeFilter === 'arrival' && isArrival) ||
      (typeFilter === 'complete' && isDeparture && isArrival);

    return matchesSearch && matchesType;
  });

  // Statistiques
  const stats = {
    total: reports.length,
    departure: reports.filter(r => r.departure_inspection !== null).length,
    arrival: reports.filter(r => r.arrival_inspection !== null).length,
    complete: reports.filter(r => r.is_complete).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Hero Header avec Image d'Inspection */}
      <div className="relative w-full shadow-2xl mb-8 overflow-hidden">
        {/* Image de fond optimisée pour mobile */}
        <div className="w-full">
          <OptimizedImage
            src="/inspection-banner.png"
            alt="Rapport d'inspection véhicule"
            className="w-full h-auto object-cover"
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%230891b2'/%3E%3Cstop offset='50%25' style='stop-color:%2306b6d4'/%3E%3Cstop offset='100%25' style='stop-color:%2314b8a6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='300' fill='url(%23g)'/%3E%3C/svg%3E"
            eager={false} // Lazy load sur mobile
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Total</span>
                <div className="bg-blue-500/20 p-2 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500 mt-1">Tous les rapports</p>
            </div>
          </div>

          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Enlèvement</span>
                <div className="bg-green-500/20 p-2 rounded-xl">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-green-600">{stats.departure}</p>
              <p className="text-xs text-green-600/70 mt-1">Inspections départ</p>
            </div>
          </div>

          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Livraison</span>
                <div className="bg-blue-500/20 p-2 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-blue-600">{stats.arrival}</p>
              <p className="text-xs text-blue-600/70 mt-1">Inspections arrivée</p>
            </div>
          </div>

          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Complets</span>
                <div className="bg-purple-500/20 p-2 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-purple-600">{stats.complete}</p>
              <p className="text-xs text-purple-600/70 mt-1">Départ + Arrivée</p>
            </div>
          </div>
        </div>

      {/* Filtres et Liste */}
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 shadow-2xl rounded-3xl p-8">
        {/* Barre de recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Rechercher par mission, véhicule, immatriculation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-sm hover:shadow-md transition-all"
            />
          </div>

          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-12 pr-10 py-4 rounded-2xl border-2 border-slate-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 bg-white cursor-pointer appearance-none shadow-sm hover:shadow-md transition-all font-semibold"
            >
              <option value="all">📋 Tous les types</option>
              <option value="departure">🚀 Enlèvement</option>
              <option value="arrival">🏁 Livraison</option>
              <option value="complete">✅ Complets</option>
            </select>
          </div>
        </div>

        {/* Liste des rapports */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl">
            <div className="bg-white/80 backdrop-blur-sm w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-2">Aucun rapport trouvé</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {searchTerm || typeFilter !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Les rapports d\'inspection sont générés automatiquement lors de vos missions'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredReports.map((report) => {
              const isDeparture = report.departure_inspection !== null;
              const isArrival = report.arrival_inspection !== null;
              const isExpanded = expandedReport === report.mission_id;

              return (
                <div
                  key={report.mission_id}
                  className="group relative backdrop-blur-sm bg-white/80 border-2 border-white/60 rounded-2xl p-6 hover:bg-white hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
                >
                  {/* Effet de brillance au hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  
                  <div className="relative flex flex-col lg:flex-row gap-6">
                    {/* Contenu principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                            report.is_complete
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                              : isDeparture
                              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                              : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                          }`}
                        >
                          {report.is_complete ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : isDeparture ? (
                            <MapPin className="w-6 h-6" />
                          ) : (
                            <Truck className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">
                            {report.is_complete
                              ? 'Inspection Complète'
                              : isDeparture
                              ? 'Inspection Enlèvement'
                              : 'Inspection Livraison'}
                          </h3>
                          <p className="text-sm text-slate-600">
                            Mission: {report.mission_reference || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">
                            {report.vehicle_brand} {report.vehicle_model}
                            {report.vehicle_plate && ` • ${report.vehicle_plate}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(report.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Bouton d'expansion */}
                      <button
                        onClick={() => toggleExpand(report.mission_id)}
                        className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-2 text-sm"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" /> Masquer les détails
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" /> Voir les détails
                          </>
                        )}
                      </button>

                      {/* Détails expandables */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                          {isDeparture && report.departure_inspection && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Inspection Enlèvement
                              </h4>
                              <div className="text-sm text-green-700 space-y-1">
                                <p><strong>État général:</strong> {report.departure_inspection.overall_condition || 'N/A'}</p>
                                {report.departure_inspection.mileage_km && (
                                  <p><strong>Kilométrage:</strong> {report.departure_inspection.mileage_km.toLocaleString('fr-FR')} km</p>
                                )}
                                {report.departure_inspection.fuel_level && (
                                  <p><strong>Niveau carburant:</strong> {report.departure_inspection.fuel_level}%</p>
                                )}
                                {report.departure_inspection.notes && (
                                  <p><strong>Notes:</strong> {report.departure_inspection.notes}</p>
                                )}
                              </div>
                              
                              {/* Photos d'enlèvement */}
                              {report.departure_inspection.photos && report.departure_inspection.photos.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-semibold text-green-800 mb-2">
                                    Photos ({report.departure_inspection.photos.length})
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {report.departure_inspection.photos.map((photo: any, idx: number) => (
                                      <OptimizedImage
                                        key={idx}
                                        src={photo.photo_url}
                                        alt={`Photo ${photo.photo_type || idx + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border border-green-300"
                                        onClick={() => window.open(photo.photo_url, '_blank')}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {isArrival && report.arrival_inspection && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Inspection Livraison
                              </h4>
                              <div className="text-sm text-blue-700 space-y-1">
                                <p><strong>État général:</strong> {report.arrival_inspection.overall_condition || 'N/A'}</p>
                                {report.arrival_inspection.mileage_km && (
                                  <p><strong>Kilométrage:</strong> {report.arrival_inspection.mileage_km.toLocaleString('fr-FR')} km</p>
                                )}
                                {report.arrival_inspection.fuel_level && (
                                  <p><strong>Niveau carburant:</strong> {report.arrival_inspection.fuel_level}%</p>
                                )}
                                {report.arrival_inspection.notes && (
                                  <p><strong>Notes:</strong> {report.arrival_inspection.notes}</p>
                                )}
                              </div>
                              
                              {/* Photos de livraison */}
                              {report.arrival_inspection.photos && report.arrival_inspection.photos.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-semibold text-blue-800 mb-2">
                                    Photos ({report.arrival_inspection.photos.length})
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {report.arrival_inspection.photos.map((photo: any, idx: number) => (
                                      <OptimizedImage
                                        key={idx}
                                        src={photo.photo_url}
                                        alt={`Photo ${photo.photo_type || idx + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border border-blue-300"
                                        onClick={() => window.open(photo.photo_url, '_blank')}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end gap-3">
                      {report.is_complete ? (
                        <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold border border-purple-300">
                          Complet
                        </span>
                      ) : isDeparture ? (
                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold border border-green-300">
                          Enlèvement
                        </span>
                      ) : (
                        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold border border-blue-300">
                          Livraison
                        </span>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadPDF(report)}
                          disabled={generatingPDF}
                          className="p-3 bg-teal-100 hover:bg-teal-200 rounded-lg transition text-teal-700 disabled:opacity-50"
                          title="Télécharger le PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEmailModal(report)}
                          className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition text-blue-700"
                          title="Envoyer par email"
                        >
                          <Mail className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPhotos(report)}
                          className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition text-purple-700"
                          title="Télécharger les photos"
                        >
                          <Image className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section informative */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-500/5 to-slate-600/5 border border-slate-300/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-teal-600" />
          À propos des rapports d'inspection
        </h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>Inspection d'enlèvement:</strong> Effectuée au moment de la prise en charge du véhicule. Elle documente l'état initial du véhicule avant transport.
          </p>
          <p>
            <strong>Inspection de livraison:</strong> Réalisée à la remise du véhicule. Elle permet de vérifier que le véhicule est dans le même état qu'au départ.
          </p>
          <p>
            <strong>Rapports PDF:</strong> Chaque inspection peut être exportée en PDF avec photos, signatures et détails complets pour vos dossiers et assurances.
          </p>
          <p>
            <strong>Conservation:</strong> Tous vos rapports sont automatiquement sauvegardés et accessibles à tout moment depuis cette page.
          </p>
        </div>
      </div>

      {/* Modal Email */}
      {emailModalReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-teal-600" />
                Envoyer par email
              </h3>
              <button
                onClick={() => setEmailModalReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Infos rapport */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm text-slate-600">
                <strong>Mission:</strong> {emailModalReport.mission_reference}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Véhicule:</strong> {emailModalReport.vehicle_brand} {emailModalReport.vehicle_model}
                {emailModalReport.vehicle_plate && ` (${emailModalReport.vehicle_plate})`}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Type:</strong> {emailModalReport.is_complete ? 'Complet (départ + arrivée)' : 'Partiel'}
              </p>
            </div>

            {/* Alerte informative */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex gap-3">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="flex-1 text-sm text-blue-900">
                  <p className="font-semibold mb-2">Votre client email va s'ouvrir</p>
                  <p className="text-blue-700">
                    Un brouillon sera créé avec le message pré-rempli. 
                    <strong className="block mt-1">N'oubliez pas de joindre :</strong>
                  </p>
                  <ul className="list-disc list-inside mt-2 text-blue-700 space-y-1">
                    <li>Le PDF du rapport (bouton <Download className="w-3 h-3 inline" />)</li>
                    <li>Les photos (bouton <Image className="w-3 h-3 inline" />)</li>
                  </ul>
                </div>
              </div>
            </div>

            <input
              type="email"
              placeholder="Adresse email du destinataire"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => setEmailModalReport(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailAddress.trim()}
                className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Ouverture...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Ouvrir mon email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
