/**
 * 📄 MES NUMÉRISATIONS - PAGE WEB
 * Documents scannés avec visualisation améliorée :
 * - Vue grille / liste toggle
 * - Miniatures pour les images
 * - Date formatée, badge type, nombre de pages
 * - Suppression sur docs officiels
 * - Visionneuse PDF/image inline avec zoom
 * - Recherche
 */

import { useState, useEffect, useRef } from 'react';
import {
  FileText, Image as ImageIcon, Eye, Share2, Trash2,
  RefreshCw, Folder, X, Download, Search, Grid3X3,
  List, ZoomIn, ZoomOut, Calendar, Tag, FileStack,
} from 'lucide-react';
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
  context?: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  generic:    { label: 'Document',    color: 'bg-blue-100 text-blue-700' },
  scan_pro:   { label: 'Scanner Pro', color: 'bg-purple-100 text-purple-700' },
  invoice:    { label: 'Facture',     color: 'bg-green-100 text-green-700' },
  contract:   { label: 'Contrat',     color: 'bg-orange-100 text-orange-700' },
  inspection: { label: 'Inspection',  color: 'bg-teal-100 text-teal-700' },
};

function formatDate(d?: string | null) {
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(d));
  } catch { return ''; }
}

function TypeBadge({ type }: { type: string | null }) {
  const t = TYPE_LABELS[type ?? 'generic'] ?? { label: type ?? 'Autre', color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.color}`}>
      <Tag className="w-3 h-3" />
      {t.label}
    </span>
  );
}

// ── Visionneuse ──────────────────────────────────────────────────────────────
function DocumentViewer({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const isPdf = url.toLowerCase().includes('.pdf');
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const download = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = title;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={onClose}>
      <div
        className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur border-b border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-white font-semibold text-sm truncate max-w-xs">{title}</h2>
        <div className="flex items-center gap-1">
          {!isPdf && (
            <>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors" title="Dézoom">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-white/60 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.25))}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors" title="Zoom">
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={download}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors ml-1" title="Télécharger">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
      >
        {isPdf ? (
          <iframe
            src={`${url}#toolbar=1&navpanes=0`}
            className="w-full h-full min-h-[70vh] rounded-lg border-0 bg-white"
            title={title}
          />
        ) : (
          <img
            ref={imgRef}
            src={url}
            alt={title}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.15s' }}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-zoom-in select-none"
            onClick={() => setZoom(z => z === 1 ? 2 : 1)}
          />
        )}
      </div>
    </div>
  );
}

// ── Carte document officiel ──────────────────────────────────────────────────
function OfficialCard({
  doc, grid, onView, onShare, onDelete,
}: {
  doc: OfficialDoc; grid: boolean;
  onView: () => void; onShare: () => void; onDelete: () => void;
}) {
  const isPdf = doc.document_url?.toLowerCase().includes('.pdf');

  if (grid) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all overflow-hidden flex flex-col group">
        <div
          className="relative h-40 bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center cursor-pointer"
          onClick={onView}
        >
          {isPdf ? (
            <FileText className="w-16 h-16 text-teal-400" />
          ) : (
            <img
              src={doc.document_url}
              alt={doc.document_title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye className="w-8 h-8 text-white drop-shadow" />
          </div>
        </div>
        <div className="p-3 flex-1 flex flex-col gap-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {doc.document_title || 'Document'}
          </h3>
          <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
            <TypeBadge type={doc.document_type} />
            {doc.pages_count != null && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <FileStack className="w-3 h-3" />{doc.pages_count}p
              </span>
            )}
          </div>
          {doc.created_at && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />{formatDate(doc.created_at)}
            </p>
          )}
        </div>
        <div className="px-3 pb-3 flex gap-2">
          <button onClick={onView}
            className="flex-1 py-1.5 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium hover:bg-teal-100 transition-colors flex items-center justify-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Voir
          </button>
          <button onClick={onShare}
            className="py-1.5 px-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="py-1.5 px-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden bg-teal-50 flex-shrink-0 cursor-pointer"
        onClick={onView}
      >
        {isPdf ? (
          <FileText className="w-7 h-7 text-teal-500" />
        ) : (
          <img src={doc.document_url} alt="" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{doc.document_title || 'Document'}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <TypeBadge type={doc.document_type} />
          {doc.pages_count != null && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FileStack className="w-3 h-3" />{doc.pages_count} page{doc.pages_count > 1 ? 's' : ''}
            </span>
          )}
          {doc.created_at && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{formatDate(doc.created_at)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onView}
          className="p-2 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors" title="Voir">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={onShare}
          className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors" title="Partager">
          <Share2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete}
          className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors" title="Supprimer">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function MyDocuments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'officiels' | 'brouillons'>('officiels');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [grid, setGrid] = useState(true);
  const [search, setSearch] = useState('');

  const [officialDocs, setOfficialDocs] = useState<OfficialDoc[]>([]);
  const [rawFiles, setRawFiles] = useState<RawFileItem[]>([]);

  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try { await Promise.all([loadOfficialDocs(), loadRawFiles()]); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const loadOfficialDocs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('inspection_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    setOfficialDocs(data || []);
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
      const exts = ['.jpg', '.jpeg', '.png', '.pdf'];
      for (const item of level1) {
        if (exts.some(e => item.name.endsWith(e))) {
          collected.push({ path: `${base}/${item.name}`, name: item.name });
        } else {
          const level2 = await listStorage(`${base}/${item.name}`);
          for (const f of level2) {
            if (exts.some(e => f.name.endsWith(e))) {
              collected.push({ path: `${base}/${item.name}/${f.name}`, name: f.name, context: item.name });
            }
          }
        }
      }
      collected.sort((a, b) => b.name.localeCompare(a.name));
      setRawFiles(collected);
    } catch (e) { console.error(e); }
  };

  const deleteOfficial = async (doc: OfficialDoc) => {
    if (!confirm(`Supprimer "${doc.document_title}" ?`)) return;
    try {
      await supabase.from('inspection_documents').delete().eq('id', doc.id);
      if (doc.document_url) {
        const uri = new URL(doc.document_url);
        const parts = uri.pathname.split('/');
        const idx = parts.findIndex(p => p === 'inspection-documents');
        if (idx !== -1) {
          const storagePath = parts.slice(idx + 2).join('/');
          await supabase.storage.from('inspection-documents').remove([decodeURIComponent(storagePath)]);
        }
      }
      setOfficialDocs(prev => prev.filter(d => d.id !== doc.id));
      showToast('success', 'Supprimé', 'Document supprimé');
    } catch {
      showToast('error', 'Erreur', 'Suppression impossible');
    }
  };

  const deleteRaw = async (item: RawFileItem) => {
    if (!confirm(`Supprimer ${item.name} ?`)) return;
    try {
      await supabase.storage.from('inspection-documents').remove([item.path]);
      setRawFiles(prev => prev.filter(f => f.path !== item.path));
      showToast('success', 'Supprimé', 'Fichier supprimé');
    } catch {
      showToast('error', 'Erreur', 'Suppression impossible');
    }
  };

  const shareDocument = async (url: string, title: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('success', 'Copié', 'Lien copié dans le presse-papiers');
      }
    } catch { /* user cancelled */ }
  };

  const filteredOfficial = officialDocs.filter(d =>
    !search ||
    (d.document_title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.document_type ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredRaw = rawFiles.filter(f =>
    !search ||
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.context ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 pt-6 pb-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Mes numérisations</h1>
              <p className="text-teal-100 text-sm mt-0.5">
                {officialDocs.length} document{officialDocs.length !== 1 ? 's' : ''} officiels
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setGrid(g => !g)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors" title="Vue grille / liste">
                {grid ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
              </button>
              <button onClick={onRefresh} disabled={refreshing}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabs inside header */}
          <div className="flex gap-1">
            {(['officiels', 'brouillons'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-semibold rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-teal-600'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}>
                {tab === 'officiels' ? 'Officiels' : 'Brouillons'}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab ? 'bg-teal-100 text-teal-600' : 'bg-white/20 text-white'
                }`}>
                  {tab === 'officiels' ? officialDocs.length : rawFiles.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un document…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 bg-gray-50"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-10 h-10 text-teal-500 animate-spin" />
            <p className="mt-4 text-gray-500">Chargement des documents…</p>
          </div>
        ) : activeTab === 'officiels' ? (
          <>
            {filteredOfficial.length === 0 ? (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">
                  {search ? 'Aucun résultat pour cette recherche' : 'Aucun document officiel'}
                </p>
              </div>
            ) : grid ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredOfficial.map(doc => (
                  <OfficialCard key={doc.id} doc={doc} grid
                    onView={() => setViewer({ url: doc.document_url, title: doc.document_title })}
                    onShare={() => shareDocument(doc.document_url, doc.document_title)}
                    onDelete={() => deleteOfficial(doc)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOfficial.map(doc => (
                  <OfficialCard key={doc.id} doc={doc} grid={false}
                    onView={() => setViewer({ url: doc.document_url, title: doc.document_title })}
                    onShare={() => shareDocument(doc.document_url, doc.document_title)}
                    onDelete={() => deleteOfficial(doc)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {filteredRaw.length === 0 ? (
              <div className="text-center py-20">
                <Folder className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">
                  {search ? 'Aucun résultat pour cette recherche' : 'Aucun fichier brouillon'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRaw.map(file => {
                  const { data } = supabase.storage.from('inspection-documents').getPublicUrl(file.path);
                  const url = data.publicUrl;
                  const isPdf = file.name.toLowerCase().endsWith('.pdf');
                  return (
                    <div key={file.path}
                      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden bg-orange-50 flex-shrink-0 cursor-pointer"
                        onClick={() => setViewer({ url, title: file.name })}
                      >
                        {isPdf ? (
                          <FileText className="w-7 h-7 text-orange-400" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-sm">{file.name}</h3>
                        {file.context && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Mission : {file.context === 'standalone' ? 'Autonome' : file.context}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setViewer({ url, title: file.name })}
                          className="p-2 rounded-lg border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => shareDocument(url, file.name)}
                          className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteRaw(file)}
                          className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Visionneuse */}
      {viewer && (
        <DocumentViewer url={viewer.url} title={viewer.title} onClose={() => setViewer(null)} />
      )}
    </div>
  );
}
