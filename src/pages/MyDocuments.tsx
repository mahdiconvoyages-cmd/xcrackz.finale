/**
 * 📄 MES NUMÉRISATIONS - PAGE WEB (copie exacte du mobile)
 * 
 * Deux onglets:
 * 1. Officiels: Documents finalisés (table inspection_documents)
 * 2. Brouillons: Fichiers raw du storage (en cours)
 * 
 * Actions: Voir, Partager, Supprimer
 */

import { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Eye, Share2, Trash2, RefreshCw, Folder, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';

interface OfficialDoc {
  id: string;
  document_title: string;
  document_type: string | null;
  document_url: string;
  pages_count: number | null;
  created_at?: string | null;
}

interface RawFileItem {
  path: string;
  name: string;
  size?: number;
  context?: string; // missionId or 'standalone'
}

export default function MyDocuments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'officiels' | 'brouillons'>('officiels');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [officialDocs, setOfficialDocs] = useState<OfficialDoc[]>([]);
  const [rawFiles, setRawFiles] = useState<RawFileItem[]>([]);
  
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadOfficialDocs(), loadRawFiles()]);
    } catch (e) {
      console.error('Erreur chargement numérisations:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  };

  const loadOfficialDocs = async () => {
    if (!user) return;
    try {
      // RLS filtre automatiquement les documents accessibles
      const { data, error } = await supabase
        .from('inspection_documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setOfficialDocs(data || []);
      console.log(`📄 Documents officiels: ${data?.length || 0}`);
    } catch (e) {
      console.error('Erreur loadOfficialDocs:', e);
      showToast('error', 'Erreur', 'Impossible de charger les documents officiels');
    }
  };

  const listStorage = async (prefix: string) => {
    const { data, error } = await supabase.storage
      .from('inspection-documents')
      .list(prefix, { limit: 100, sortBy: { column: 'updated_at', order: 'desc' } });
    if (error) throw error;
    return data || [];
  };

  const loadRawFiles = async () => {
    if (!user) return;
    try {
      const base = `raw/${user.id}`;
      const level1 = await listStorage(base);

      const collected: RawFileItem[] = [];
      for (const item of level1) {
        const fileExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        if (fileExtensions.some(ext => item.name.endsWith(ext))) {
          collected.push({ path: `${base}/${item.name}`, name: item.name });
          continue;
        }
        // Folders: missionId or 'standalone'
        const folder = item.name;
        const level2 = await listStorage(`${base}/${folder}`);
        for (const f of level2) {
          if (fileExtensions.some(ext => f.name.endsWith(ext))) {
            collected.push({ path: `${base}/${folder}/${f.name}`, name: f.name, context: folder });
          }
        }
      }

      collected.sort((a, b) => (a.name < b.name ? 1 : -1));
      setRawFiles(collected);
      console.log(`📁 Fichiers brouillons: ${collected.length}`);
    } catch (e) {
      console.error('Erreur loadRawFiles:', e);
    }
  };

  const openViewer = (url: string) => {
    setViewerUrl(url);
    setViewerVisible(true);
  };

  const shareDocument = async (url: string, title: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('success', 'Copié', 'Lien copié dans le presse-papiers');
      }
    } catch (e) {
      console.error('Erreur partage:', e);
    }
  };

  const deleteRaw = async (item: RawFileItem) => {
    if (!confirm(`Supprimer ${item.name} ?`)) return;
    
    try {
      const { error } = await supabase.storage
        .from('inspection-documents')
        .remove([item.path]);
      if (error) throw error;
      setRawFiles(prev => prev.filter(f => f.path !== item.path));
      showToast('success', 'Supprimé', 'Fichier supprimé avec succès');
    } catch (e) {
      console.error('Erreur suppression:', e);
      showToast('error', 'Erreur', 'Suppression impossible');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Mes numérisations</h1>
              <p className="text-teal-100 text-sm">Documents officiels et brouillons</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('officiels')}
              className={`py-4 px-6 font-semibold transition-colors relative ${
                activeTab === 'officiels'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Officiels
              {officialDocs.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-600 text-xs rounded-full">
                  {officialDocs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('brouillons')}
              className={`py-4 px-6 font-semibold transition-colors relative ${
                activeTab === 'brouillons'
                  ? 'text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Brouillons
              {rawFiles.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                  {rawFiles.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-teal-500 animate-spin" />
            <p className="mt-4 text-gray-500">Chargement…</p>
          </div>
        ) : activeTab === 'officiels' ? (
          <div className="space-y-3">
            {officialDocs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun document officiel pour le moment</p>
              </div>
            ) : (
              officialDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-teal-300 transition-colors"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-teal-100 rounded-lg">
                    <FileText className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {doc.document_title || 'Document'}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {doc.document_type || 'Autre'}
                      {doc.pages_count && ` • ${doc.pages_count} page(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openViewer(doc.document_url)}
                      className="p-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Voir"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => shareDocument(doc.document_url, doc.document_title)}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      title="Partager"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rawFiles.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune numérisation brute trouvée</p>
              </div>
            ) : (
              rawFiles.map((file) => {
                const { data } = supabase.storage.from('inspection-documents').getPublicUrl(file.path);
                const url = data.publicUrl;
                const isPdf = file.name.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={file.path}
                    className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 transition-colors"
                  >
                    <div className="w-12 h-12 flex items-center justify-center bg-orange-100 rounded-lg">
                      {isPdf ? (
                        <FileText className="w-6 h-6 text-orange-600" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {file.context || 'brouillon'}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{file.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openViewer(url)}
                        className="p-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => shareDocument(url, file.name)}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        title="Partager"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteRaw(file)}
                        className="p-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Viewer Modal */}
      {viewerVisible && viewerUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black">
            <button
              onClick={() => setViewerVisible(false)}
              className="p-2 text-white hover:bg-white/10 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-white font-bold">Aperçu</h2>
            <div className="w-10" />
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            {viewerUrl.toLowerCase().includes('.pdf') ? (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title="Document PDF"
              />
            ) : (
              <img
                src={viewerUrl}
                alt="Document"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
