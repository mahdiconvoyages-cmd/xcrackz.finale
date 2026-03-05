import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMissionDeeplink } from '../lib/shareCode';
import {
  Package, User, Car, MapPin, Phone, Calendar, FileText, DollarSign, Ruler, Building2,
  Truck, ArrowRight, Download, AlertTriangle,
  CheckCircle2, Clock, XCircle, Loader2, Smartphone
} from 'lucide-react';

/* ── PremiumTheme tokens ── */
const T = {
  primaryBlue: '#0066FF',
  primaryIndigo: '#5B8DEF',
  primaryPurple: '#8B7EE8',
  primaryTeal: '#14B8A6',
  accentGreen: '#10B981',
  accentAmber: '#F59E0B',
  accentRed: '#EF4444',
  deepOrange: '#E65100',
  lightBg: '#F8F9FA',
  fieldBg: '#F8FAFC',
  borderDefault: '#E5E7EB',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:     { label: 'En attente', color: T.accentAmber, bg: `${T.accentAmber}15`, icon: Clock },
  in_progress: { label: 'En cours',   color: T.primaryBlue, bg: `${T.primaryBlue}15`, icon: Truck },
  completed:   { label: 'Terminée',   color: T.accentGreen, bg: `${T.accentGreen}15`, icon: CheckCircle2 },
  cancelled:   { label: 'Annulée',    color: T.accentRed,   bg: `${T.accentRed}15`,   icon: XCircle },
};

/* ── Section card component ── */
function InfoCard({ color, icon: Icon, title, children }: { color: string; icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${color}25`, boxShadow: `0 2px 8px ${color}0A` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}12` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h3 className="text-sm font-bold tracking-wide" style={{ color: T.textPrimary }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── Detail row ── */
function DetailRow({ icon: Icon, label, value, color, href }: { icon: any; label: string; value: string; color?: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: color || T.textTertiary }} />
      <span className="text-xs flex-1" style={{ color: T.textSecondary }}>{label}</span>
      <span className="text-sm font-semibold text-right" style={{ color: href ? T.primaryBlue : T.textPrimary }}>{value}</span>
    </div>
  );
  return href ? <a href={href} className="block hover:opacity-80 transition-opacity">{content}</a> : content;
}

interface Mission { id: string; [key: string]: any; }

export default function MissionDetail() {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!missionId) { setError('ID de mission manquant'); setLoading(false); return; }
    loadMission();
    if (isMobile) {
      window.location.href = getMissionDeeplink(missionId);
      setTimeout(() => setLoading(false), 2500);
    } else {
      setLoading(false);
    }
  }, [missionId]);

  const loadMission = async () => {
    try {
      const { data, error: err } = await supabase.from('missions').select('*').eq('id', missionId!).single();
      if (err) throw err;
      setMission(data);
    } catch {
      setError('Mission introuvable ou inaccessible');
    }
  };

  const handleOpenInApp = () => { if (missionId) window.location.href = getMissionDeeplink(missionId); };

  const statusCfg = mission ? (STATUS_MAP[mission.status] || STATUS_MAP.pending) : STATUS_MAP.pending;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.lightBg }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: T.primaryBlue }} />
          <p className="text-sm font-medium" style={{ color: T.textSecondary }}>
            {isMobile ? 'Ouverture dans l\'application...' : 'Chargement de la mission...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: T.lightBg }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center" style={{ border: `1px solid ${T.accentRed}20` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${T.accentRed}12` }}>
            <AlertTriangle className="w-8 h-8" style={{ color: T.accentRed }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: T.textPrimary }}>Mission introuvable</h1>
          <p className="text-sm mb-6" style={{ color: T.textSecondary }}>{error || 'Cette mission n\'existe pas ou n\'est plus accessible.'}</p>
          <button onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: T.primaryBlue }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const vehicleTypeLabel = mission.vehicle_type === 'VL' ? 'Véhicule Léger' : mission.vehicle_type === 'VU' ? 'Véhicule Utilitaire' : mission.vehicle_type === 'PL' ? 'Poids Lourd' : mission.vehicle_type;

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.lightBg }}>
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b" style={{ borderColor: T.borderDefault }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryTeal})` }}>
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: T.textPrimary }}>CHECKSFLEET</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: statusCfg.bg }}>
            <statusCfg.icon className="w-4 h-4" style={{ color: statusCfg.color }} />
            <span className="text-xs font-bold" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto p-4 lg:p-8">
        {/* Title bar */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: T.textPrimary }}>
                {mission.title || `Mission ${mission.reference || ''}`}
              </h1>
              {mission.reference && (
                <span className="inline-block mt-1 text-xs font-mono font-semibold px-3 py-1 rounded-lg"
                  style={{ backgroundColor: T.fieldBg, border: `1px solid ${T.borderDefault}`, color: T.textSecondary }}>
                  {mission.reference}
                </span>
              )}
            </div>
            {mission.price > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" style={{ color: T.accentAmber }} />
                <span className="text-2xl font-bold" style={{ color: T.primaryTeal }}>
                  {Number(mission.price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Two-column layout on desktop ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* Mandataire */}
            {(mission.mandataire_name || mission.mandataire_company) && (
              <InfoCard color={T.primaryPurple} icon={Building2} title="Mandataire">
                <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{mission.mandataire_name || '—'}</p>
                {mission.mandataire_company && <p className="text-xs mt-1" style={{ color: T.textSecondary }}>{mission.mandataire_company}</p>}
              </InfoCard>
            )}

            {/* Vehicle */}
            {(mission.vehicle_brand || mission.vehicle_model || mission.vehicle_plate) && (
              <InfoCard color={T.primaryTeal} icon={Car} title="Véhicule">
                <div className="space-y-1">
                  <DetailRow icon={Car} label="Marque / Modèle" value={`${mission.vehicle_brand || ''} ${mission.vehicle_model || ''}`.trim()} />
                  {mission.vehicle_plate && <DetailRow icon={Package} label="Immatriculation" value={mission.vehicle_plate} />}
                  {mission.vehicle_type && <DetailRow icon={Truck} label="Type" value={vehicleTypeLabel} />}
                  {mission.vehicle_vin && <DetailRow icon={Package} label="N° VIN" value={mission.vehicle_vin} />}
                </div>
              </InfoCard>
            )}

            {/* Price / Distance / Date */}
            {(mission.price || mission.distance_km || mission.scheduled_date) && (
              <InfoCard color={T.accentAmber} icon={DollarSign} title="Détails">
                <div className="space-y-1">
                  {mission.price > 0 && <DetailRow icon={DollarSign} label="Prix" value={`${Number(mission.price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`} color={T.accentAmber} />}
                  {mission.distance_km && <DetailRow icon={Ruler} label="Distance" value={`${mission.distance_km} km`} />}
                  {mission.scheduled_date && (
                    <DetailRow icon={Calendar} label="Date prévue" value={new Date(mission.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} />
                  )}
                </div>
              </InfoCard>
            )}

            {/* Notes */}
            {mission.notes && (
              <InfoCard color={T.textSecondary} icon={FileText} title="Notes">
                <p className="text-sm whitespace-pre-wrap" style={{ color: T.textSecondary }}>{mission.notes}</p>
              </InfoCard>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">
            {/* Pickup */}
            {mission.pickup_address && (
              <InfoCard color={T.accentGreen} icon={MapPin} title="Point d'Enlèvement">
                <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: `${T.accentGreen}08`, border: `1px solid ${T.accentGreen}15` }}>
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{mission.pickup_address}</p>
                </div>
                {mission.pickup_contact_name && <DetailRow icon={User} label="Contact" value={mission.pickup_contact_name} color={T.accentGreen} />}
                {mission.pickup_contact_phone && <DetailRow icon={Phone} label="Téléphone" value={mission.pickup_contact_phone} color={T.accentGreen} href={`tel:${mission.pickup_contact_phone}`} />}
                {mission.pickup_date && (
                  <DetailRow icon={Calendar} label="Date" value={new Date(mission.pickup_date).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                )}
              </InfoCard>
            )}

            {/* Route visualization */}
            {mission.pickup_address && mission.delivery_address && (
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: T.accentGreen }} />
                <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${T.accentGreen}, ${T.primaryBlue})` }} />
                <ArrowRight className="w-5 h-5" style={{ color: T.primaryBlue }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: T.primaryBlue }} />
              </div>
            )}

            {/* Delivery */}
            {mission.delivery_address && (
              <InfoCard color={T.primaryBlue} icon={MapPin} title="Point de Livraison">
                <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: `${T.primaryBlue}08`, border: `1px solid ${T.primaryBlue}15` }}>
                  <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{mission.delivery_address}</p>
                </div>
                {mission.delivery_contact_name && <DetailRow icon={User} label="Contact" value={mission.delivery_contact_name} color={T.primaryBlue} />}
                {mission.delivery_contact_phone && <DetailRow icon={Phone} label="Téléphone" value={mission.delivery_contact_phone} color={T.primaryBlue} href={`tel:${mission.delivery_contact_phone}`} />}
                {mission.delivery_date && (
                  <DetailRow icon={Calendar} label="Date" value={new Date(mission.delivery_date).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                )}
              </InfoCard>
            )}
          </div>
        </div>

        {/* ── CTA Section ── */}
        <div className="mt-8 rounded-2xl bg-white p-6 lg:p-8" style={{ border: `1px solid ${T.borderDefault}`, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div className="max-w-lg mx-auto text-center">
            <button onClick={handleOpenInApp}
              className="w-full py-4 rounded-xl text-base font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-3"
              style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryTeal})` }}>
              <Smartphone className="w-5 h-5" />
              Ouvrir dans CHECKSFLEET
            </button>

            <p className="mt-3 text-xs" style={{ color: T.textTertiary }}>
              {isMobile ? 'Touchez le bouton pour ouvrir l\'application' : 'Scannez ce lien avec votre téléphone'}
            </p>

            <div className="mt-6 pt-6 border-t" style={{ borderColor: T.borderDefault }}>
              <h4 className="text-sm font-bold mb-4" style={{ color: T.textPrimary }}>Pourquoi rejoindre ChecksFleet ?</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: DollarSign, color: T.accentGreen, text: 'Gagnez de l\'argent en convoyant' },
                  { icon: CheckCircle2, color: T.primaryBlue, text: 'Inspections photo professionnelles' },
                  { icon: MapPin, color: T.primaryPurple, text: 'Suivi GPS en temps réel' },
                ].map((f, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: `${f.color}08` }}>
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${f.color}15` }}>
                      <f.icon className="w-4 h-4" style={{ color: f.color }} />
                    </div>
                    <span className="text-xs text-center font-medium" style={{ color: T.textSecondary }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <a href="https://play.google.com/store/apps/details?id=com.checksfleet.app"
              target="_blank" rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: T.accentGreen }}>
              <Download className="w-4 h-4" />
              Télécharger sur Google Play
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
