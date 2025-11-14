/**
 * 📄 MES DOCUMENTS - Page de gestion des documents scannés
 * 
 * Fonctionnalités:
 * - Liste de tous les documents scannés
 * - Filtres par type, filtre, plateforme, date
 * - Recherche par nom
 * - Prévisualisation avec lightbox
 * - Export PDF, Partage, Téléchargement
 * - Suppression avec confirmation
 * - Statistiques utilisateur
 * - Synchronisation temps réel
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Share2,
  FileDown,
  Camera,
  Loader,
  Calendar,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  X,
  Check,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserDocuments,
  deleteDocument,
  exportDocumentToPDF,
  downloadDocument,
  UnifiedDocument
} from '../services/unifiedDocumentService';
import { showToast } from '../components/Toast';

type FilterType = 'all' | 'bw' | 'grayscale' | 'color';
type DocumentType = 'all' | 'registration' | 'insurance' | 'receipt' | 'generic';
type PlatformType = 'all' | 'web' | 'mobile';

export default function MyDocuments() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // États
  const [documents, setDocuments] = useState<UnifiedDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<UnifiedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType>('all');
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<UnifiedDocument | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    web: 0,
    mobile: 0,
    bw: 0,
    grayscale: 0,
    color: 0,
    totalSize: 0
  });

  // Charger les documents
  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user]);

  // Filtrer les documents
  useEffect(() => {
    let filtered = [...documents];

    // Filtre de recherche
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtre par type de filtre
    if (selectedFilterType !== 'all') {
      filtered = filtered.filter(doc => doc.filter_type === selectedFilterType);
    }

    // Filtre par type de document
    if (selectedDocType !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === selectedDocType);
    }

    // Filtre par plateforme
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(doc => doc.platform === selectedPlatform);
    }

    setFilteredDocuments(filtered);
  }, [documents, searchQuery, selectedFilterType, selectedDocType, selectedPlatform]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getUserDocuments(user!.id);
      setDocuments(docs);

      // Calculer les statistiques
      const stats = {
        total: docs.length,
        web: docs.filter(d => d.platform === 'web').length,
        mobile: docs.filter(d => d.platform === 'mobile').length,
        bw: docs.filter(d => d.filter_type === 'bw').length,
        grayscale: docs.filter(d => d.filter_type === 'grayscale').length,
        color: docs.filter(d => d.filter_type === 'color').length,
        totalSize: docs.reduce((acc, d) => acc + (d.file_size || 0), 0)
      };
      setStats(stats);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      showToast('Erreur lors du chargement des documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (doc: UnifiedDocument) => {
    if (!confirm(`Supprimer "${doc.name}" ?`)) return;

    try {
      setProcessingId(doc.id);
      const success = await deleteDocument(doc.id);
      
      if (success) {
        showToast('Document supprimé avec succès', 'success');
        loadDocuments();
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast('Erreur lors de la suppression', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownload = async (doc: UnifiedDocument) => {
    try {
      setProcessingId(doc.id);
      await downloadDocument(doc.public_url, `${doc.name}.jpg`);
      showToast('Téléchargement réussi', 'success');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      showToast('Erreur lors du téléchargement', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExportPDF = async (doc: UnifiedDocument) => {
    try {
      setProcessingId(doc.id);
      await exportDocumentToPDF(doc.public_url, doc.name);
      showToast('PDF exporté avec succès', 'success');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      showToast('Erreur lors de l\'export PDF', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleShare = async (doc: UnifiedDocument) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: doc.name,
          text: 'Partage de document',
          url: doc.public_url
        });
      } else {
        await navigator.clipboard.writeText(doc.public_url);
        showToast('Lien copié dans le presse-papier', 'success');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  const openLightbox = (doc: UnifiedDocument) => {
    setSelectedDoc(doc);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setSelectedDoc(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilterBadgeColor = (filter: string) => {
    switch (filter) {
      case 'bw': return 'bg-gray-600';
      case 'grayscale': return 'bg-slate-600';
      case 'color': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getDocTypeName = (type: string) => {
    switch (type) {
      case 'registration': return 'Carte Grise';
      case 'insurance': return 'Assurance';
      case 'receipt': return 'Reçu';
      default: return 'Document';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 font-medium">Retour</span>
            </button>

            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              Mes Documents
            </h1>

            <button
              onClick={() => navigate('/scanner')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/25"
            >
              <Camera className="w-5 h-5" />
              <span className="hidden sm:inline">Nouveau Scan</span>
            </button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Total</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">Web</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.web}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Mobile</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.mobile}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-gray-600" />
                <span className="text-xs text-gray-400">N&B</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.bw}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                <span className="text-xs text-gray-400">Gris</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.grayscale}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-xs text-gray-400">Couleur</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.color}</p>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un document..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtres
            </button>
          </div>

          {/* Filtres étendus */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Filtre par type de filtre */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Type de filtre</label>
                  <select
                    value={selectedFilterType}
                    onChange={(e) => setSelectedFilterType(e.target.value as FilterType)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">Tous les filtres</option>
                    <option value="bw">N&B</option>
                    <option value="grayscale">Niveaux de gris</option>
                    <option value="color">Couleur</option>
                  </select>
                </div>

                {/* Filtre par type de document */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Type de document</label>
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">Tous les types</option>
                    <option value="registration">Carte Grise</option>
                    <option value="insurance">Assurance</option>
                    <option value="receipt">Reçu</option>
                    <option value="generic">Générique</option>
                  </select>
                </div>

                {/* Filtre par plateforme */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Plateforme</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value as PlatformType)}
                    className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="all">Toutes les plateformes</option>
                    <option value="web">Web</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
              </div>

              {/* Reset filters */}
              {(selectedFilterType !== 'all' || selectedDocType !== 'all' || selectedPlatform !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedFilterType('all');
                    setSelectedDocType('all');
                    setSelectedPlatform('all');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Liste des documents */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {documents.length === 0 ? 'Aucun document scanné' : 'Aucun résultat'}
            </h3>
            <p className="text-gray-400 mb-6">
              {documents.length === 0
                ? 'Commencez par scanner votre premier document'
                : 'Essayez de modifier vos filtres de recherche'}
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => navigate('/scanner')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold inline-flex items-center gap-2 transition-all shadow-lg"
              >
                <Camera className="w-5 h-5" />
                Scanner un document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="group bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all hover:shadow-xl"
              >
                {/* Image preview */}
                <div
                  className="relative aspect-[3/4] bg-gray-800 cursor-pointer overflow-hidden"
                  onClick={() => openLightbox(doc)}
                >
                  <img
                    src={doc.public_url}
                    alt={doc.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-2">
                    <span className={`px-2 py-1 ${getFilterBadgeColor(doc.filter_type)} text-white text-xs font-semibold rounded-lg`}>
                      {doc.filter_type === 'bw' ? 'N&B' : doc.filter_type === 'grayscale' ? 'Gris' : 'Couleur'}
                    </span>
                    {doc.platform === 'mobile' && (
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        Mobile
                      </span>
                    )}
                  </div>
                </div>

                {/* Infos */}
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1 truncate">{doc.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <Calendar className="w-3 h-3" />
                    {formatDate(doc.created_at)}
                  </div>

                  {doc.document_type && doc.document_type !== 'generic' && (
                    <span className="inline-block px-2 py-1 bg-blue-600/20 text-blue-300 text-xs font-medium rounded-lg mb-3">
                      {getDocTypeName(doc.document_type)}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => handleShare(doc)}
                      disabled={processingId === doc.id}
                      className="p-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-all disabled:opacity-50"
                      title="Partager"
                    >
                      <Share2 className="w-4 h-4 mx-auto" />
                    </button>

                    <button
                      onClick={() => handleExportPDF(doc)}
                      disabled={processingId === doc.id}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all disabled:opacity-50"
                      title="Export PDF"
                    >
                      {processingId === doc.id ? (
                        <Loader className="w-4 h-4 mx-auto animate-spin" />
                      ) : (
                        <FileDown className="w-4 h-4 mx-auto" />
                      )}
                    </button>

                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={processingId === doc.id}
                      className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all disabled:opacity-50"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4 mx-auto" />
                    </button>

                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={processingId === doc.id}
                      className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all disabled:opacity-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>

                  {/* Taille fichier */}
                  {doc.file_size && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {formatFileSize(doc.file_size)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && selectedDoc && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="max-w-5xl w-full">
            <img
              src={selectedDoc.public_url}
              alt={selectedDoc.name}
              className="w-full h-auto rounded-xl shadow-2xl"
            />
            <div className="mt-4 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">{selectedDoc.name}</h3>
              <p className="text-gray-400">{formatDate(selectedDoc.created_at)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
