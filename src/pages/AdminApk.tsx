// @ts-nocheck
import { useEffect, useState } from 'react';
import { Download, Upload, Trash2, CheckCircle, XCircle, Smartphone, Bell, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminApk() {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ version: '', code: '', file: null as File | null, notes: '', mandatory: false, sendNotification: true });

  useEffect(() => { loadVersions(); }, []);

  const loadVersions = async () => {
    try {
      const { data } = await supabase.from('app_versions').select('*').order('version_code', { ascending: false });
      setVersions(data || []);
    } finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!form.file || !form.version || !form.code) return alert('Remplir tous les champs obligatoires');
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const fileName = `CHECKSFLEET-v${form.version}-${form.code}.apk`;
      const { error: uploadError } = await supabase.storage.from('apk-files').upload(fileName, form.file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('apk-files').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('app_versions').insert({
        version_name: form.version,
        version_code: parseInt(form.code),
        apk_url: publicUrl,
        file_size: form.file.size,
        release_notes: form.notes || null,
        is_mandatory: form.mandatory,
        uploaded_by: user.id,
      });
      if (insertError) throw insertError;

      // Désactiver les anciennes versions automatiquement
      await supabase.from('app_versions').update({ is_active: false }).neq('version_code', parseInt(form.code)).eq('platform', 'android');
      await supabase.from('app_versions').update({ is_active: true }).eq('version_code', parseInt(form.code));

      // Envoyer une notification push à tous les utilisateurs si coché
      if (form.sendNotification) {
        await sendUpdateNotification(form.version, form.notes || null);
      }

      setShowModal(false);
      setForm({ version: '', code: '', file: null, notes: '', mandatory: false, sendNotification: true });
      await loadVersions();
      alert('✅ Version uploadée avec succès !' + (form.sendNotification ? ' Notification envoyée à tous les utilisateurs.' : ''));
    } catch (err: any) {
      alert(`❌ Erreur: ${err.message}`);
    } finally { setUploading(false); }
  };

  const toggleStatus = async (id: string, active: boolean) => {
    await supabase.from('app_versions').update({ is_active: !active }).eq('id', id);
    await loadVersions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('⚠️ Supprimer cette version APK ?')) return;
    const { data: version } = await supabase.from('app_versions').select('apk_url').eq('id', id).single();
    if (version?.apk_url) {
      const fileName = version.apk_url.split('/').pop();
      if (fileName) await supabase.storage.from('apk-files').remove([fileName]);
    }
    await supabase.from('app_versions').delete().eq('id', id);
    await loadVersions();
  };

  const sendUpdateNotification = async (versionName: string, notes: string | null) => {
    try {
      // Récupérer tous les utilisateurs avec un fcm_token
      const { data: users } = await supabase
        .from('profiles')
        .select('id, fcm_token')
        .not('fcm_token', 'is', null)
        .neq('fcm_token', '');

      if (!users || users.length === 0) {
        console.log('Aucun utilisateur avec FCM token');
        alert('⚠️ Aucun utilisateur avec un token de notification trouvé.');
        return;
      }

      console.log(`Found ${users.length} users with FCM tokens`);

      // Envoyer la notification push via Edge Function avec tokens directs
      const title = '🆕 Nouvelle version disponible !';
      const body = `ChecksFleet v${versionName} est disponible. ${notes || 'Mettez à jour pour profiter des dernières améliorations.'}`;

      // Passer les tokens directement pour éviter le problème de lookup DB
      const fcmTokens = users.map(u => ({ userId: u.id, token: u.fcm_token }));

      // Chercher l'URL de téléchargement de cette version
      const { data: versionRow } = await supabase
        .from('app_versions')
        .select('apk_url, version_code, release_notes')
        .eq('version_name', versionName)
        .eq('is_active', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: result, error } = await supabase.functions.invoke('send-notification', {
        body: {
          fcmTokens,
          type: 'app_update',
          title,
          message: body,
          data: {
            type: 'app_update',
            version: versionName,
            download_url: versionRow?.apk_url || '',
            build_number: String(versionRow?.version_code || ''),
            release_notes: notes || '',
          },
        },
      });

      if (error) {
        console.error('Edge Function error:', error);
        alert(`⚠️ Erreur envoi: ${error.message}`);
      } else {
        console.log('Notification result:', result);
        alert(`✅ Notification envoyée à ${result?.recipients || 0}/${users.length} utilisateurs`);
      }
    } catch (err) {
      console.error('Erreur envoi notifications:', err);
    }
  };

  const handleNotifyAll = async (version: any) => {
    if (!confirm(`Envoyer une notification push à tous les utilisateurs pour la version ${version.version_name} ?`)) return;
    setNotifying(version.id);
    try {
      await sendUpdateNotification(version.version_name, version.release_notes);
    } catch (err: any) {
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setNotifying(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Versions APK</h1>
          <p className="text-slate-500 mt-1">Gérer les versions de l'application mobile</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all">
          <Upload className="w-4 h-4" /> Nouvelle version
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {versions.length === 0 ? (
          <div className="p-16 text-center">
            <Smartphone className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">Aucune version</h3>
            <p className="text-sm text-slate-400 mb-6">Uploadez votre première version APK</p>
            <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all">
              <Upload className="w-4 h-4" /> Uploader
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Taille</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">DL</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map(v => (
                  <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{v.version_name}</span>
                        {v.is_mandatory && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full">OBLIGATOIRE</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{v.version_code}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{(v.file_size / (1024 * 1024)).toFixed(1)} MB</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{v.download_count || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{new Date(v.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a href={v.apk_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Télécharger">
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => handleNotifyAll(v)} disabled={notifying === v.id} className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition disabled:opacity-50" title="Notifier tous les utilisateurs">
                          {notifying === v.id ? <span className="w-3.5 h-3.5 block animate-spin rounded-full border-2 border-purple-400 border-t-transparent" /> : <Bell className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => toggleStatus(v.id, v.is_active)} className={`p-1.5 rounded-lg transition ${v.is_active ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`} title={v.is_active ? 'Désactiver' : 'Activer'}>
                          {v.is_active ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-slate-900">Nouvelle version APK</h3>
              <button onClick={() => { setShowModal(false); setForm({ version: '', code: '', file: null, notes: '', mandatory: false, sendNotification: true }); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><XCircle className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Version *</label>
                <input type="text" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0.0" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Code *</label>
                <input type="number" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="1" min="1" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Fichier APK *</label>
                <input type="file" accept=".apk" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-700 file:font-bold" />
                {form.file && <p className="text-xs text-teal-600 mt-1">{form.file.name} ({(form.file.size / (1024 * 1024)).toFixed(1)} MB)</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notes de version</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Nouveautés, corrections..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium resize-none" />
              </div>
              <label className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.mandatory} onChange={e => setForm(f => ({ ...f, mandatory: e.target.checked }))} className="w-4 h-4 rounded text-orange-600" />
                <span className="text-sm font-semibold text-slate-700">Mise à jour obligatoire</span>
              </label>
              <label className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={form.sendNotification} onChange={e => setForm(f => ({ ...f, sendNotification: e.target.checked }))} className="w-4 h-4 rounded text-purple-600" />
                <div>
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> Notifier les utilisateurs</span>
                  <span className="text-xs text-slate-500">Envoyer une notification push à tous les utilisateurs de l'app</span>
                </div>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setForm({ version: '', code: '', file: null, notes: '', mandatory: false, sendNotification: true }); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
              <button onClick={handleUpload} disabled={uploading || !form.file || !form.version || !form.code} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">
                {uploading ? 'Upload...' : 'Uploader'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
