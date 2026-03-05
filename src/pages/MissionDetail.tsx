// @ts-nocheck
// Mission Detail — Page publique PREMIUM (identique Flutter mission_detail_screen.dart)
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMissionDeeplink } from '../lib/shareCode';
import {
  Package, User, Car, MapPin, Phone, Calendar, FileText, DollarSign, Ruler, Building2,
  Truck, ArrowRight, Download, AlertTriangle, RefreshCw, Store, Navigation, Hash,
  CheckCircle2, Clock, XCircle, Loader2, Smartphone, ExternalLink, Shield, Zap
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
  cardBg: '#FFFFFF',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:     { label: 'En attente',  color: T.accentAmber, bg: `${T.accentAmber}15`, icon: Clock },
  assigned:    { label: 'Assignée',    color: '#8B5CF6',     bg: '#8B5CF615',           icon: User },
  in_progress: { label: 'En cours',    color: T.primaryBlue, bg: `${T.primaryBlue}15`, icon: Truck },
  completed:   { label: 'Terminée',    color: T.accentGreen, bg: `${T.accentGreen}15`, icon: CheckCircle2 },
  cancelled:   { label: 'Annulée',     color: T.accentRed,   bg: `${T.accentRed}15`,   icon: XCircle },
};

/* ── Section card ── */
function InfoCard({ color, icon: Icon, title, children, className = '' }: { color: string; icon: any; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 lg:p-6 transition-all duration-300 hover:shadow-lg group ${className}`} style={{
      backgroundColor: T.cardBg,
      border: `1px solid ${color}20`,
      boxShadow: `0 4px 16px ${color}08, 0 1px 4px rgba(0,0,0,0.03)`,
    }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl transition-transform group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h3 className="text-sm font-bold tracking-wide" style={{ color }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ── Detail row ── */
function DetailRow({ icon: Icon, label, value, color, href, bold }: { icon: any; label: string; value: string; color?: string; href?: string; bold?: boolean }) {
  const content = (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0" style={{ borderColor: `${T.borderDefault}60` }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color || T.textTertiary}10` }}>
        <Icon className="w-4 h-4" style={{ color: color || T.textTertiary }} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[11px] uppercase tracking-wider font-semibold block" style={{ color: T.textTertiary }}>{label}</span>
        <span className={`text-sm ${bold ? 'font-bold' : 'font-semibold'} block truncate`} style={{ color: href ? T.primaryBlue : T.textPrimary }}>{value}</span>
      </div>
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

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.lightBg }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryTeal})`, boxShadow: `0 6px 20px ${T.primaryBlue}30` }}>
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
            {isMobile ? 'Ouverture dans l\'application...' : 'Chargement de la mission...'}
          </p>
          <p className="text-xs mt-1" style={{ color: T.textTertiary }}>CHECKSFLEET</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !mission) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: T.lightBg }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center" style={{ border: `1px solid ${T.accentRed}15` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: `linear-gradient(135deg, ${T.accentRed}15, ${T.accentRed}08)` }}>
            <AlertTriangle className="w-8 h-8" style={{ color: T.accentRed }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: T.textPrimary }}>Mission introuvable</h1>
          <p className="text-sm mb-6" style={{ color: T.textSecondary }}>{error || 'Cette mission n\'existe pas ou n\'est plus accessible.'}</p>
          <button onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryTeal})` }}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const vehicleLabel = `${mission.vehicle_brand || ''} ${mission.vehicle_model || ''}`.trim() || 'Véhicule';
  const vehicleTypeLabel = mission.vehicle_type === 'VL' ? 'Voiture' : mission.vehicle_type === 'VU' ? 'Utilitaire' : mission.vehicle_type === 'PL' ? 'Poids Lourd' : mission.vehicle_type;

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.lightBg }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .anim-up { animation: fadeUp 0.4s ease-out forwards; }
        .anim-d1 { animation-delay: 0.05s; opacity: 0; }
        .anim-d2 { animation-delay: 0.1s; opacity: 0; }
        .anim-d3 { animation-delay: 0.15s; opacity: 0; }
        .anim-d4 { animation-delay: 0.2s; opacity: 0; }
        .anim-d5 { animation-delay: 0.25s; opacity: 0; }
      `}</style>

      {/* ═══════ HERO HEADER (Flutter SliverAppBar gradient) ═══════ */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryTeal})` }}>
        {/* Decorative circles */}
        <div className="absolute top-[-40px] right-[-40px] w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#FFF' }} />
        <div className="absolute bottom-[-20px] left-[-30px] w-28 h-28 rounded-full opacity-10" style={{ backgroundColor: '#FFF' }} />

        <div className="max-w-6xl mx-auto px-4 lg:px-8">
          {/* Top bar */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">CHECKSFLEET</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/15 backdrop-blur-sm">
              <statusCfg.icon className="w-4 h-4 text-white" />
              <span className="text-xs font-bold text-white">{statusCfg.label}</span>
            </div>
          </div>

          {/* Hero content */}
          <div className="pb-8 lg:pb-10 pt-2">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div className="flex-1">
                <p className="text-white/70 text-xs font-bold tracking-widest uppercase mb-2">MISSION DE CONVOYAGE</p>
                <h1 className="text-2xl lg:text-4xl font-bold text-white leading-tight">
                  {mission.title || vehicleLabel}
                </h1>
                {mission.reference && (
                  <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                    <Hash className="w-3 h-3 text-white/70" />
                    <span className="text-xs font-mono font-bold text-white/90">{mission.reference}</span>
                  </span>
                )}
              </div>
              {mission.price > 0 && (
                <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 backdrop-blur-sm">
                  <DollarSign className="w-5 h-5 text-white/80" />
                  <span className="text-2xl lg:text-3xl font-bold text-white">
                    {Number(mission.price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </span>
                </div>
              )}
            </div>

            {/* Quick info pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {mission.vehicle_type && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10">
                  <Truck className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-semibold text-white/90">{vehicleTypeLabel}</span>
                </div>
              )}
              {mission.vehicle_plate && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10">
                  <Hash className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-bold text-white/90">{mission.vehicle_plate}</span>
                </div>
              )}
              {mission.has_restitution && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${T.deepOrange}30` }}>
                  <RefreshCw className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-xs font-bold text-white/90">Restitution</span>
                </div>
              )}
              {mission.distance_km && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10">
                  <Ruler className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-xs font-semibold text-white/90">{mission.distance_km} km</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ CONTENT ═══════ */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
          {/* ── LEFT COLUMN (3/5 width) ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Itinerary Card (route timeline) */}
            {(mission.pickup_address || mission.delivery_address) && (
              <div className="anim-up anim-d1">
                <InfoCard color={T.accentGreen} icon={Navigation} title="Itinéraire">
                  <div className="flex gap-4">
                    {/* Vertical timeline */}
                    <div className="flex flex-col items-center pt-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.accentGreen}, ${T.accentGreen}AA)`, boxShadow: `0 3px 10px ${T.accentGreen}30` }}>
                        <MapPin className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div className="w-0.5 flex-1 my-2 min-h-[60px]" style={{ background: `linear-gradient(to bottom, ${T.accentGreen}, ${T.primaryBlue})` }} />
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryBlue}AA)`, boxShadow: `0 3px 10px ${T.primaryBlue}30` }}>
                        <MapPin className="w-4.5 h-4.5 text-white" />
                      </div>
                    </div>

                    {/* Addresses */}
                    <div className="flex-1 space-y-5">
                      {/* Pickup */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: T.accentGreen }}>ENLÈVEMENT</p>
                        {mission.pickup_location_name && (
                          <p className="text-base font-bold mb-0.5" style={{ color: T.textPrimary }}>{mission.pickup_location_name}</p>
                        )}
                        <p className="text-sm" style={{ color: T.textSecondary }}>{mission.pickup_address}</p>
                        {mission.pickup_date && (
                          <p className="text-xs mt-1.5 font-medium" style={{ color: T.textTertiary }}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(mission.pickup_date).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {mission.pickup_contact_name && (
                          <div className="flex items-center gap-2 mt-2">
                            <User className="w-3.5 h-3.5" style={{ color: T.accentGreen }} />
                            <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{mission.pickup_contact_name}</span>
                            {mission.pickup_contact_phone && (
                              <a href={`tel:${mission.pickup_contact_phone}`} className="text-sm font-semibold hover:underline" style={{ color: T.primaryBlue }}>
                                {mission.pickup_contact_phone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Delivery */}
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: T.primaryBlue }}>LIVRAISON</p>
                        {mission.delivery_location_name && (
                          <p className="text-base font-bold mb-0.5" style={{ color: T.textPrimary }}>{mission.delivery_location_name}</p>
                        )}
                        <p className="text-sm" style={{ color: T.textSecondary }}>{mission.delivery_address}</p>
                        {mission.delivery_date && (
                          <p className="text-xs mt-1.5 font-medium" style={{ color: T.textTertiary }}>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {new Date(mission.delivery_date).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {mission.delivery_contact_name && (
                          <div className="flex items-center gap-2 mt-2">
                            <User className="w-3.5 h-3.5" style={{ color: T.primaryBlue }} />
                            <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{mission.delivery_contact_name}</span>
                            {mission.delivery_contact_phone && (
                              <a href={`tel:${mission.delivery_contact_phone}`} className="text-sm font-semibold hover:underline" style={{ color: T.primaryBlue }}>
                                {mission.delivery_contact_phone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </InfoCard>
              </div>
            )}

            {/* Restitution Card */}
            {mission.has_restitution && (mission.restitution_pickup_address || mission.restitution_delivery_address) && (
              <div className="anim-up anim-d2">
                <InfoCard color={T.deepOrange} icon={RefreshCw} title="Restitution">
                  <div className="space-y-3">
                    {mission.restitution_pickup_address && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: `${T.deepOrange}06`, border: `1px solid ${T.deepOrange}15` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: T.deepOrange }}>DÉPART RETOUR</p>
                        <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{mission.restitution_pickup_address}</p>
                        {mission.restitution_pickup_date && (
                          <p className="text-xs mt-1" style={{ color: T.textTertiary }}>
                            {new Date(mission.restitution_pickup_date).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}
                    {mission.restitution_delivery_address && (
                      <div className="rounded-xl p-3" style={{ backgroundColor: `${T.deepOrange}06`, border: `1px solid ${T.deepOrange}15` }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: T.deepOrange }}>ARRIVÉE RETOUR</p>
                        <p className="text-sm font-medium" style={{ color: T.textPrimary }}>{mission.restitution_delivery_address}</p>
                        {mission.restitution_delivery_date && (
                          <p className="text-xs mt-1" style={{ color: T.textTertiary }}>
                            {new Date(mission.restitution_delivery_date).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}
                    {(mission.restitution_vehicle_brand || mission.restitution_vehicle_plate) && (
                      <div className="flex items-center gap-3 pt-2" style={{ borderTop: `1px solid ${T.deepOrange}15` }}>
                        <Car className="w-4 h-4" style={{ color: T.deepOrange }} />
                        <span className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                          {[mission.restitution_vehicle_brand, mission.restitution_vehicle_model].filter(Boolean).join(' ')}
                          {mission.restitution_vehicle_plate ? ` — ${mission.restitution_vehicle_plate}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </InfoCard>
              </div>
            )}

            {/* Notes */}
            {mission.notes && (
              <div className="anim-up anim-d3">
                <InfoCard color={T.textSecondary} icon={FileText} title="Notes">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: T.textSecondary }}>{mission.notes}</p>
                </InfoCard>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (2/5 width) ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Mandataire */}
            {(mission.mandataire_name || mission.mandataire_company) && (
              <div className="anim-up anim-d1">
                <InfoCard color={T.primaryPurple} icon={Building2} title="Donneur d'ordre">
                  <DetailRow icon={User} label="Nom" value={mission.mandataire_name || '—'} color={T.primaryPurple} bold />
                  {mission.mandataire_company && <DetailRow icon={Building2} label="Société" value={mission.mandataire_company} color={T.primaryPurple} />}
                </InfoCard>
              </div>
            )}

            {/* Vehicle */}
            {(mission.vehicle_brand || mission.vehicle_model) && (
              <div className="anim-up anim-d2">
                <InfoCard color={T.primaryTeal} icon={Car} title="Véhicule">
                  <DetailRow icon={Car} label="Véhicule" value={vehicleLabel} color={T.primaryTeal} bold />
                  {mission.vehicle_type && <DetailRow icon={Truck} label="Type" value={vehicleTypeLabel} color={T.primaryTeal} />}
                  {mission.vehicle_plate && <DetailRow icon={Hash} label="Immatriculation" value={mission.vehicle_plate} color={T.primaryTeal} />}
                  {mission.vehicle_vin && <DetailRow icon={Hash} label="N° VIN" value={mission.vehicle_vin} color={T.primaryTeal} />}
                </InfoCard>
              </div>
            )}

            {/* Prix & Détails */}
            {(mission.price || mission.distance_km || mission.scheduled_date) && (
              <div className="anim-up anim-d3">
                <InfoCard color={T.accentAmber} icon={DollarSign} title="Détails">
                  {mission.price > 0 && <DetailRow icon={DollarSign} label="Prix" value={`${Number(mission.price).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`} color={T.accentAmber} bold />}
                  {mission.distance_km && <DetailRow icon={Ruler} label="Distance" value={`${mission.distance_km} km`} color={T.accentAmber} />}
                  {mission.scheduled_date && (
                    <DetailRow icon={Calendar} label="Date prévue"
                      value={new Date(mission.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                      color={T.accentAmber} />
                  )}
                </InfoCard>
              </div>
            )}

            {/* CTA Card */}
            <div className="anim-up anim-d4">
              <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.primaryBlue}20`, boxShadow: `0 4px 20px ${T.primaryBlue}10` }}>
                <div className="p-5 lg:p-6" style={{ background: `linear-gradient(135deg, ${T.primaryBlue}08, ${T.primaryTeal}06)` }}>
                  <button onClick={handleOpenInApp}
                    className="w-full py-4 rounded-xl text-base font-bold text-white transition-all hover:shadow-xl hover:scale-[1.01] flex items-center justify-center gap-3"
                    style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryTeal})`, boxShadow: `0 4px 16px ${T.primaryBlue}30` }}>
                    <Smartphone className="w-5 h-5" />
                    Ouvrir dans CHECKSFLEET
                  </button>

                  <p className="mt-3 text-center text-xs" style={{ color: T.textTertiary }}>
                    {isMobile ? 'Touchez pour ouvrir l\'application' : 'Disponible sur Android'}
                  </p>

                  <div className="mt-4 pt-4 space-y-3" style={{ borderTop: `1px solid ${T.borderDefault}60` }}>
                    {[
                      { icon: Zap, color: T.accentAmber, text: 'Gagnez en convoyant des véhicules' },
                      { icon: Shield, color: T.primaryBlue, text: 'Inspections photo professionnelles' },
                      { icon: MapPin, color: T.accentGreen, text: 'Suivi GPS temps réel' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${f.color}12` }}>
                          <f.icon className="w-4 h-4" style={{ color: f.color }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: T.textSecondary }}>{f.text}</span>
                      </div>
                    ))}
                  </div>

                  <a href="https://play.google.com/store/apps/details?id=com.checksfleet.app"
                    target="_blank" rel="noopener noreferrer"
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: T.accentGreen, boxShadow: `0 3px 10px ${T.accentGreen}25` }}>
                    <Download className="w-4 h-4" />
                    Télécharger sur Google Play
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 py-6 text-center" style={{ borderTop: `1px solid ${T.borderDefault}` }}>
        <p className="text-xs" style={{ color: T.textTertiary }}>
          CHECKSFLEET — Solution de convoyage automobile professionnelle
        </p>
      </div>
    </div>
  );
}
