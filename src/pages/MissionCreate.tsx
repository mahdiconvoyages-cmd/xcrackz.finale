// @ts-nocheck
// Création de mission — DESIGN PREMIUM identique Flutter MissionCreateScreenNew
// 3 étapes : Mandataire+Véhicule → Enlèvement → Livraison+Options
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, X, ChevronRight, ChevronLeft, MapPin, Search, Car, Upload, Download,
  User, Building2, Truck, Phone, Hash, DollarSign, FileText, RefreshCw, Calendar, Clock,
  CheckCircle, Store, Briefcase, Navigation, CircleDot
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { showToast } from '../components/Toast';
import BuyCreditModal from '../components/BuyCreditModal';

/* ── PremiumTheme tokens (identique Flutter premium_theme.dart) ── */
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

/* ── Step config ── */
const STEPS = [
  { label: 'Véhicule', icon: Car, color: T.primaryTeal, description: 'Mandataire et véhicule' },
  { label: 'Enlèvement', icon: Upload, color: T.accentGreen, description: 'Lieu et date de départ' },
  { label: 'Livraison', icon: Download, color: T.primaryBlue, description: 'Destination et options' },
];

const SEC = {
  mandataire: T.primaryPurple,
  vehicule: T.primaryTeal,
  pickupLieu: T.accentGreen,
  pickupContact: T.accentGreen,
  deliveryLieu: T.primaryBlue,
  deliveryContact: T.primaryBlue,
  options: T.primaryIndigo,
  restitution: T.deepOrange,
};

/* ── Autocomplete adresses ── */
interface AddressSuggestion { label: string; name: string; city: string; postcode: string; latitude: number; longitude: number; }

async function searchAddresses(query: string): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) return [];
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      label: f.properties.label || '', name: f.properties.name || '',
      city: f.properties.city || '', postcode: f.properties.postcode || '',
      latitude: f.geometry?.coordinates?.[1] || 0, longitude: f.geometry?.coordinates?.[0] || 0,
    }));
  } catch { return []; }
}

/* ── Reusable Field ── */
function Field({ label, children, required: isReq, color }: { label: string; children: React.ReactNode; required?: boolean; color?: string }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1.5 tracking-wide" style={{ color: isReq ? (color || T.primaryBlue) : T.textSecondary }}>
        {label}{isReq && <span className="ml-0.5" style={{ color: T.accentRed }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-all duration-200 border focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 hover:border-[#CBD5E1]";
const inputStyle: React.CSSProperties = { backgroundColor: T.fieldBg, borderColor: T.borderDefault, color: T.textPrimary };

/* ── Section Card (identique Flutter _sectionCard) ── */
function SectionCard({ color, icon: Icon, title, children, className = '' }: { color: string; icon: any; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 lg:p-6 transition-all duration-300 hover:shadow-lg ${className}`} style={{
      backgroundColor: T.cardBg,
      border: `1px solid ${color}20`,
      boxShadow: `0 4px 16px ${color}08, 0 1px 4px rgba(0,0,0,0.03)`,
    }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl" style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h3 className="text-[15px] font-bold tracking-tight" style={{ color }}>{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/* ── Address autocomplete ── */
function AddressAutocompleteField({ label, value, onChange, onSelect, placeholder, required: isRequired, color }: {
  label: string; value: string; onChange: (v: string) => void; onSelect: (s: AddressSuggestion) => void;
  placeholder: string; required?: boolean; color?: string;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleInput = useCallback((val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      const r = await searchAddresses(val);
      setSuggestions(r); setShowSuggestions(r.length > 0);
    }, 300);
  }, [onChange]);

  const stepColor = color || T.primaryTeal;
  return (
    <Field label={label} required={isRequired} color={stepColor}>
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${stepColor}80` }} />
          <input type="text" value={value} onChange={e => handleInput(e.target.value)}
            placeholder={placeholder} required={isRequired}
            className={inputCls + " pl-11"} style={inputStyle} />
        </div>
        {showSuggestions && (
          <div className="absolute z-50 w-full mt-1.5 bg-white border rounded-xl shadow-xl max-h-56 overflow-y-auto" style={{ borderColor: T.borderDefault }}>
            {suggestions.map((s, i) => (
              <button key={i} type="button"
                className="w-full text-left px-4 py-3 hover:bg-[#F0F9FF] flex items-start gap-3 border-b last:border-0 transition-colors"
                onClick={() => { onSelect(s); setShowSuggestions(false); setSuggestions([]); }}>
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: stepColor }} />
                <span className="text-sm" style={{ color: T.textSecondary }}>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}

/* ══════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function MissionCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { credits, deductCredits, hasEnoughCredits } = useCredits();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    reference: `MSN${Date.now().toString().substring(5)}`,
    mandataire_name: '', mandataire_company: '',
    vehicle_brand: '', vehicle_model: '', vehicle_type: 'VL' as 'VL' | 'VU' | 'PL', vehicle_plate: '', vehicle_vin: '',
    // Enlèvement
    pickup_location_name: '',
    pickup_address: '', pickup_postcode: '', pickup_city: '',
    pickup_lat: null as number | null, pickup_lng: null as number | null,
    pickup_date: '', pickup_time: '', pickup_contact_name: '', pickup_contact_phone: '',
    // Livraison
    delivery_location_name: '',
    delivery_address: '', delivery_postcode: '', delivery_city: '',
    delivery_lat: null as number | null, delivery_lng: null as number | null,
    delivery_date: '', delivery_time: '', delivery_contact_name: '', delivery_contact_phone: '',
    price: '', notes: '',
    // Restitution
    has_restitution: false,
    restitution_pickup_same_as_delivery: true, restitution_delivery_same_as_pickup: true,
    restitution_pickup_address: '', restitution_pickup_postcode: '', restitution_pickup_city: '',
    restitution_pickup_lat: null as number | null, restitution_pickup_lng: null as number | null,
    restitution_pickup_date: '', restitution_pickup_time: '',
    restitution_pickup_contact_name: '', restitution_pickup_contact_phone: '',
    restitution_delivery_address: '', restitution_delivery_postcode: '', restitution_delivery_city: '',
    restitution_delivery_lat: null as number | null, restitution_delivery_lng: null as number | null,
    restitution_delivery_contact_name: '', restitution_delivery_contact_phone: '',
    restitution_delivery_date: '', restitution_delivery_time: '',
    restitution_vehicle_brand: '', restitution_vehicle_model: '', restitution_vehicle_plate: '',
  });

  const requiredCredits = formData.has_restitution ? 2 : 1;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleNext = () => currentStep < totalSteps - 1 && setCurrentStep(currentStep + 1);
  const handlePrevious = () => currentStep > 0 && setCurrentStep(currentStep - 1);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.mandataire_name && formData.vehicle_brand && formData.vehicle_model;
      case 1: return formData.pickup_address && formData.pickup_city && formData.pickup_contact_name && formData.pickup_date;
      case 2: {
        const ok = formData.delivery_address && formData.delivery_city && formData.delivery_contact_name && formData.delivery_date;
        if (!ok) return false;
        if (formData.has_restitution) {
          if (!formData.restitution_pickup_date) return false;
          if (!formData.restitution_pickup_same_as_delivery && (!formData.restitution_pickup_address || !formData.restitution_pickup_city)) return false;
          if (!formData.restitution_delivery_same_as_pickup && (!formData.restitution_delivery_address || !formData.restitution_delivery_city)) return false;
        }
        return true;
      }
      default: return false;
    }
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasEnoughCredits(requiredCredits)) { setShowBuyCreditModal(true); return; }
    setLoading(true); setError('');
    try {
      const dr = await deductCredits(requiredCredits, `Création mission ${formData.reference}${formData.has_restitution ? ' + restitution' : ''}`, 'mission');
      if (!dr.success) throw new Error(dr.error);
      const pickupDT = formData.pickup_time ? `${formData.pickup_date}T${formData.pickup_time}` : formData.pickup_date;
      const deliveryDT = formData.delivery_time ? `${formData.delivery_date}T${formData.delivery_time}` : formData.delivery_date;
      const pickupAddr = `${formData.pickup_address}, ${formData.pickup_postcode} ${formData.pickup_city}`;
      const deliveryAddr = `${formData.delivery_address}, ${formData.delivery_postcode} ${formData.delivery_city}`;

      const ins: any = {
        user_id: user.id, reference: formData.reference, status: 'pending',
        mandataire_name: formData.mandataire_name.trim() || null, mandataire_company: formData.mandataire_company.trim() || null,
        vehicle_brand: formData.vehicle_brand.trim(), vehicle_model: formData.vehicle_model.trim(),
        vehicle_type: formData.vehicle_type, vehicle_plate: formData.vehicle_plate.trim().toUpperCase() || null,
        vehicle_vin: formData.vehicle_vin.trim().toUpperCase() || null,
        pickup_location_name: formData.pickup_location_name.trim() || null,
        pickup_address: pickupAddr, pickup_city: formData.pickup_city.trim(), pickup_postal_code: formData.pickup_postcode.trim(),
        pickup_lat: formData.pickup_lat, pickup_lng: formData.pickup_lng, pickup_date: pickupDT || null,
        pickup_contact_name: formData.pickup_contact_name.trim() || null, pickup_contact_phone: formData.pickup_contact_phone.trim() || null,
        delivery_location_name: formData.delivery_location_name.trim() || null,
        delivery_address: deliveryAddr, delivery_city: formData.delivery_city.trim(), delivery_postal_code: formData.delivery_postcode.trim(),
        delivery_lat: formData.delivery_lat, delivery_lng: formData.delivery_lng, delivery_date: deliveryDT || null,
        delivery_contact_name: formData.delivery_contact_name.trim() || null, delivery_contact_phone: formData.delivery_contact_phone.trim() || null,
        price: formData.price ? parseFloat(formData.price) : null, notes: formData.notes.trim() || null,
        has_restitution: formData.has_restitution,
      };

      if (formData.has_restitution) {
        const rpa = formData.restitution_pickup_same_as_delivery ? deliveryAddr : `${formData.restitution_pickup_address}, ${formData.restitution_pickup_postcode} ${formData.restitution_pickup_city}`;
        const rda = formData.restitution_delivery_same_as_pickup ? pickupAddr : `${formData.restitution_delivery_address}, ${formData.restitution_delivery_postcode} ${formData.restitution_delivery_city}`;
        const rpdt = formData.restitution_pickup_time ? `${formData.restitution_pickup_date}T${formData.restitution_pickup_time}` : formData.restitution_pickup_date;
        Object.assign(ins, {
          restitution_pickup_address: rpa,
          restitution_pickup_city: formData.restitution_pickup_same_as_delivery ? formData.delivery_city.trim() : formData.restitution_pickup_city.trim(),
          restitution_pickup_postal_code: formData.restitution_pickup_same_as_delivery ? formData.delivery_postcode.trim() : formData.restitution_pickup_postcode.trim(),
          restitution_pickup_lat: formData.restitution_pickup_same_as_delivery ? formData.delivery_lat : formData.restitution_pickup_lat,
          restitution_pickup_lng: formData.restitution_pickup_same_as_delivery ? formData.delivery_lng : formData.restitution_pickup_lng,
          restitution_pickup_date: rpdt || null,
          restitution_pickup_contact_name: formData.restitution_pickup_same_as_delivery ? (formData.delivery_contact_name.trim() || null) : (formData.restitution_pickup_contact_name.trim() || null),
          restitution_pickup_contact_phone: formData.restitution_pickup_same_as_delivery ? (formData.delivery_contact_phone.trim() || null) : (formData.restitution_pickup_contact_phone.trim() || null),
          restitution_delivery_address: rda,
          restitution_delivery_city: formData.restitution_delivery_same_as_pickup ? formData.pickup_city.trim() : formData.restitution_delivery_city.trim(),
          restitution_delivery_postal_code: formData.restitution_delivery_same_as_pickup ? formData.pickup_postcode.trim() : formData.restitution_delivery_postcode.trim(),
          restitution_delivery_lat: formData.restitution_delivery_same_as_pickup ? formData.pickup_lat : formData.restitution_delivery_lat,
          restitution_delivery_lng: formData.restitution_delivery_same_as_pickup ? formData.pickup_lng : formData.restitution_delivery_lng,
          restitution_delivery_contact_name: formData.restitution_delivery_same_as_pickup ? (formData.pickup_contact_name.trim() || null) : (formData.restitution_delivery_contact_name.trim() || null),
          restitution_delivery_contact_phone: formData.restitution_delivery_same_as_pickup ? (formData.pickup_contact_phone.trim() || null) : (formData.restitution_delivery_contact_phone.trim() || null),
          restitution_delivery_date: formData.restitution_delivery_date ? (formData.restitution_delivery_time ? `${formData.restitution_delivery_date}T${formData.restitution_delivery_time}` : formData.restitution_delivery_date) : null,
          restitution_vehicle_brand: formData.restitution_vehicle_brand.trim() || null,
          restitution_vehicle_model: formData.restitution_vehicle_model.trim() || null,
          restitution_vehicle_plate: formData.restitution_vehicle_plate.trim().toUpperCase() || null,
        });
      }

      const { error: ie } = await supabase.from('missions').insert(ins);
      if (ie) throw ie;
      showToast('success', 'Mission créée', `${requiredCredits} crédit${requiredCredits > 1 ? 's' : ''} déduit${requiredCredits > 1 ? 's' : ''}.`);
      navigate('/team-missions');
    } catch (err: any) {
      console.error(err); setError(err.message || 'Erreur lors de la création');
    } finally { setLoading(false); }
  };

  /* ═══════════════════════════════════
     RENDER STEPS
     ═══════════════════════════════════ */

  const renderStep0 = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 animate-fadeIn">
      {/* Mandataire */}
      <SectionCard color={SEC.mandataire} icon={User} title="Donneur d'ordre">
        <Field label="Nom du donneur d'ordre" required color={SEC.mandataire}>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.mandataire}60` }} />
            <input type="text" name="mandataire_name" value={formData.mandataire_name} onChange={handleChange}
              placeholder="Jean Dupont" required className={inputCls + " pl-11"} style={inputStyle} />
          </div>
        </Field>
        <Field label="Société" color={SEC.mandataire}>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.mandataire}60` }} />
            <input type="text" name="mandataire_company" value={formData.mandataire_company} onChange={handleChange}
              placeholder="Transport Express SARL" className={inputCls + " pl-11"} style={inputStyle} />
          </div>
        </Field>
      </SectionCard>

      {/* Véhicule */}
      <SectionCard color={SEC.vehicule} icon={Car} title="Véhicule">
        <Field label="Type de véhicule" required color={SEC.vehicule}>
          <div className="grid grid-cols-3 gap-3">
            {([
              { v: 'VL', l: 'Voiture', I: Car },
              { v: 'VU', l: 'Utilitaire', I: Truck },
              { v: 'PL', l: 'Poids lourd', I: Truck },
            ] as const).map(({ v, l, I }) => {
              const sel = formData.vehicle_type === v;
              return (
                <button key={v} type="button" onClick={() => setFormData(p => ({ ...p, vehicle_type: v as any }))}
                  className="flex flex-col items-center gap-2 py-3.5 rounded-xl font-semibold text-xs transition-all duration-200 hover:scale-[1.02]"
                  style={sel
                    ? { background: `linear-gradient(135deg, ${SEC.vehicule}, ${SEC.vehicule}CC)`, color: '#FFF', boxShadow: `0 4px 14px ${SEC.vehicule}35` }
                    : { backgroundColor: T.fieldBg, border: `1.5px solid ${T.borderDefault}`, color: T.textSecondary }}>
                  <I className="w-5 h-5" />
                  {l}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Marque" required color={SEC.vehicule}>
          <div className="relative">
            <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.vehicule}60` }} />
            <input type="text" name="vehicle_brand" value={formData.vehicle_brand} onChange={handleChange}
              placeholder="Renault, Peugeot..." required className={inputCls + " pl-11"} style={inputStyle} />
          </div>
        </Field>
        <Field label="Modèle" required color={SEC.vehicule}>
          <div className="relative">
            <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.vehicule}60` }} />
            <input type="text" name="vehicle_model" value={formData.vehicle_model} onChange={handleChange}
              placeholder="Clio, 308..." required className={inputCls + " pl-11"} style={inputStyle} />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Immatriculation" color={SEC.vehicule}>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.vehicule}60` }} />
              <input type="text" name="vehicle_plate" value={formData.vehicle_plate} onChange={handleChange}
                placeholder="AB-123-CD" className={inputCls + " pl-11 uppercase"} style={inputStyle} />
            </div>
          </Field>
          <Field label="N° VIN" color={SEC.vehicule}>
            <div className="relative">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.vehicule}60` }} />
              <input type="text" name="vehicle_vin" value={formData.vehicle_vin} onChange={handleChange}
                placeholder="N° de série" className={inputCls + " pl-11 uppercase"} style={inputStyle} />
            </div>
          </Field>
        </div>
      </SectionCard>
    </div>
  );

  const renderStep1 = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 animate-fadeIn">
      <SectionCard color={SEC.pickupLieu} icon={MapPin} title="Lieu d'enlèvement">
        {/* Nom du lieu — identique Flutter */}
        <Field label="Nom du lieu" color={SEC.pickupLieu}>
          <div className="relative">
            <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.pickupLieu}60` }} />
            <input type="text" name="pickup_location_name" value={formData.pickup_location_name}
              onChange={handleChange}
              placeholder="Ex: Renault Versailles, Garage Dupont..."
              className={inputCls + " pl-11"} style={inputStyle} />
          </div>
          <p className="text-[11px] mt-1" style={{ color: T.textTertiary }}>Chez qui récupérer le véhicule ?</p>
        </Field>
        <AddressAutocompleteField label="Adresse" value={formData.pickup_address} color={SEC.pickupLieu}
          onChange={v => setFormData(p => ({ ...p, pickup_address: v }))}
          onSelect={s => setFormData(p => ({ ...p, pickup_address: s.name, pickup_city: s.city, pickup_postcode: s.postcode, pickup_lat: s.latitude, pickup_lng: s.longitude }))}
          placeholder="Tapez une adresse..." required />
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <Field label="Code postal" color={SEC.pickupLieu}>
              <input type="text" name="pickup_postcode" value={formData.pickup_postcode} onChange={handleChange}
                placeholder="75001" maxLength={5} className={inputCls} style={inputStyle} />
            </Field>
          </div>
          <div className="col-span-3">
            <Field label="Ville" required color={SEC.pickupLieu}>
              <input type="text" name="pickup_city" value={formData.pickup_city} onChange={handleChange}
                placeholder="Paris" required className={inputCls} style={inputStyle} />
            </Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" required color={SEC.pickupLieu}>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.pickupLieu}60` }} />
              <input type="date" name="pickup_date" value={formData.pickup_date} onChange={handleChange} required
                className={inputCls + " pl-11"} style={inputStyle} />
            </div>
          </Field>
          <Field label="Heure" color={SEC.pickupLieu}>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.pickupLieu}60` }} />
              <input type="time" name="pickup_time" value={formData.pickup_time} onChange={handleChange}
                className={inputCls + " pl-11"} style={inputStyle} />
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard color={SEC.pickupContact} icon={User} title="Expéditeur (contact sur place)">
        <Field label="Nom de l'expéditeur" required color={SEC.pickupContact}>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.pickupContact}60` }} />
            <input type="text" name="pickup_contact_name" value={formData.pickup_contact_name} onChange={handleChange}
              placeholder="Jean Dupont" required className={inputCls + " pl-11"} style={inputStyle} />
          </div>
        </Field>
        <Field label="Téléphone" color={SEC.pickupContact}>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.pickupContact}60` }} />
            <input type="tel" name="pickup_contact_phone" value={formData.pickup_contact_phone} onChange={handleChange}
              placeholder="06 XX XX XX XX" className={inputCls + " pl-11"} style={inputStyle} />
          </div>
        </Field>
        {/* Visual summary - pickup entered data */}
        {(formData.pickup_address || formData.pickup_city) && (
          <div className="mt-2 rounded-xl p-3.5" style={{ backgroundColor: `${SEC.pickupLieu}06`, border: `1px solid ${SEC.pickupLieu}15` }}>
            <div className="flex items-center gap-2 mb-1">
              <Navigation className="w-3.5 h-3.5" style={{ color: SEC.pickupLieu }} />
              <span className="text-xs font-bold" style={{ color: SEC.pickupLieu }}>Résumé enlèvement</span>
            </div>
            {formData.pickup_location_name && (
              <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{formData.pickup_location_name}</p>
            )}
            <p className="text-xs mt-0.5" style={{ color: T.textSecondary }}>
              {formData.pickup_address}{formData.pickup_city ? `, ${formData.pickup_city}` : ''}
            </p>
            {formData.pickup_date && (
              <p className="text-xs mt-1" style={{ color: T.textTertiary }}>
                {new Date(formData.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                {formData.pickup_time ? ` à ${formData.pickup_time}` : ''}
              </p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5 lg:space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        <SectionCard color={SEC.deliveryLieu} icon={MapPin} title="Lieu de livraison">
          {/* Nom du lieu — identique Flutter */}
          <Field label="Nom du lieu" color={SEC.deliveryLieu}>
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.deliveryLieu}60` }} />
              <input type="text" name="delivery_location_name" value={formData.delivery_location_name}
                onChange={handleChange}
                placeholder="Ex: Domicile client, Garage Martin..."
                className={inputCls + " pl-11"} style={inputStyle} />
            </div>
            <p className="text-[11px] mt-1" style={{ color: T.textTertiary }}>Chez qui livrer le véhicule ?</p>
          </Field>
          <AddressAutocompleteField label="Adresse" value={formData.delivery_address} color={SEC.deliveryLieu}
            onChange={v => setFormData(p => ({ ...p, delivery_address: v }))}
            onSelect={s => setFormData(p => ({ ...p, delivery_address: s.name, delivery_city: s.city, delivery_postcode: s.postcode, delivery_lat: s.latitude, delivery_lng: s.longitude }))}
            placeholder="Tapez une adresse..." required />
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-2">
              <Field label="Code postal" color={SEC.deliveryLieu}>
                <input type="text" name="delivery_postcode" value={formData.delivery_postcode} onChange={handleChange}
                  placeholder="75008" maxLength={5} className={inputCls} style={inputStyle} />
              </Field>
            </div>
            <div className="col-span-3">
              <Field label="Ville" required color={SEC.deliveryLieu}>
                <input type="text" name="delivery_city" value={formData.delivery_city} onChange={handleChange}
                  placeholder="Paris" required className={inputCls} style={inputStyle} />
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" required color={SEC.deliveryLieu}>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.deliveryLieu}60` }} />
                <input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleChange} required
                  className={inputCls + " pl-11"} style={inputStyle} />
              </div>
            </Field>
            <Field label="Heure" color={SEC.deliveryLieu}>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.deliveryLieu}60` }} />
                <input type="time" name="delivery_time" value={formData.delivery_time} onChange={handleChange}
                  className={inputCls + " pl-11"} style={inputStyle} />
              </div>
            </Field>
          </div>
        </SectionCard>

        <SectionCard color={SEC.deliveryContact} icon={User} title="Réceptionnaire (contact sur place)">
          <Field label="Nom du réceptionnaire" required color={SEC.deliveryContact}>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.deliveryContact}60` }} />
              <input type="text" name="delivery_contact_name" value={formData.delivery_contact_name} onChange={handleChange}
                placeholder="Marie Martin" required className={inputCls + " pl-11"} style={inputStyle} />
            </div>
          </Field>
          <Field label="Téléphone" color={SEC.deliveryContact}>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.deliveryContact}60` }} />
              <input type="tel" name="delivery_contact_phone" value={formData.delivery_contact_phone} onChange={handleChange}
                placeholder="06 XX XX XX XX" className={inputCls + " pl-11"} style={inputStyle} />
            </div>
          </Field>
        </SectionCard>
      </div>

      {/* Options + Restitution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
        <SectionCard color={SEC.options} icon={FileText} title="Options">
          <Field label="Prix (€)" color={SEC.options}>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.options}60` }} />
              <input type="number" name="price" value={formData.price} onChange={handleChange}
                placeholder="0.00" step="0.01" className={inputCls + " pl-11"} style={inputStyle} />
            </div>
          </Field>
          <Field label="Notes internes" color={SEC.options}>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 w-4 h-4" style={{ color: `${SEC.options}60` }} />
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
                placeholder="Informations complémentaires..."
                className="w-full rounded-xl pl-11 pr-4 py-3 text-[15px] outline-none transition-all duration-200 border focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/10 resize-none"
                style={inputStyle} />
            </div>
          </Field>
        </SectionCard>

        {/* Restitution */}
        <SectionCard color={SEC.restitution} icon={RefreshCw} title="Restitution">
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="font-bold text-sm" style={{ color: T.textPrimary }}>Ajouter une restitution</span>
              <p className="text-xs mt-0.5" style={{ color: formData.has_restitution ? SEC.restitution : T.textTertiary }}>
                {formData.has_restitution ? 'Trajet retour inclus (2 crédits)' : 'Aller simple (1 crédit)'}
              </p>
            </div>
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={formData.has_restitution}
                onChange={e => setFormData(p => ({ ...p, has_restitution: e.target.checked }))} />
              <div className="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300" style={formData.has_restitution ? { backgroundColor: SEC.restitution } : {}} />
            </div>
          </label>

          {formData.has_restitution && (
            <div className="space-y-4 pt-4 animate-fadeIn" style={{ borderTop: `1px solid ${SEC.restitution}25` }}>
              {/* Véhicule restitution */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" style={{ color: SEC.restitution }} />
                  <span className="text-sm font-bold" style={{ color: SEC.restitution }}>Véhicule restitution</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Marque" color={SEC.restitution}>
                    <input type="text" value={formData.restitution_vehicle_brand}
                      onChange={e => setFormData(p => ({ ...p, restitution_vehicle_brand: e.target.value }))}
                      placeholder="Marque" className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Modèle" color={SEC.restitution}>
                    <input type="text" value={formData.restitution_vehicle_model}
                      onChange={e => setFormData(p => ({ ...p, restitution_vehicle_model: e.target.value }))}
                      placeholder="Modèle" className={inputCls} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Immatriculation" color={SEC.restitution}>
                  <input type="text" value={formData.restitution_vehicle_plate}
                    onChange={e => setFormData(p => ({ ...p, restitution_vehicle_plate: e.target.value }))}
                    placeholder="AB-123-CD" className={inputCls + " uppercase"} style={inputStyle} />
                </Field>
              </div>

              {/* Départ restitution */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: SEC.restitution }} />
                  <span className="text-sm font-bold" style={{ color: SEC.restitution }}>Départ restitution</span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.restitution_pickup_same_as_delivery}
                    onChange={e => setFormData(p => ({ ...p, restitution_pickup_same_as_delivery: e.target.checked }))}
                    className="w-4 h-4 rounded" style={{ accentColor: SEC.restitution }} />
                  <span className="text-sm font-medium" style={{ color: T.textSecondary }}>Même adresse que la livraison</span>
                </label>
                {!formData.restitution_pickup_same_as_delivery && (
                  <div className="space-y-3 animate-fadeIn">
                    <AddressAutocompleteField label="Adresse" value={formData.restitution_pickup_address} color={SEC.restitution}
                      onChange={v => setFormData(p => ({ ...p, restitution_pickup_address: v }))}
                      onSelect={s => setFormData(p => ({ ...p, restitution_pickup_address: s.name, restitution_pickup_city: s.city, restitution_pickup_postcode: s.postcode, restitution_pickup_lat: s.latitude, restitution_pickup_lng: s.longitude }))}
                      placeholder="Adresse de départ restitution..." required />
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <Field label="Code postal" color={SEC.restitution}>
                          <input type="text" value={formData.restitution_pickup_postcode}
                            onChange={e => setFormData(p => ({ ...p, restitution_pickup_postcode: e.target.value }))}
                            className={inputCls} style={inputStyle} />
                        </Field>
                      </div>
                      <div className="col-span-3">
                        <Field label="Ville" required color={SEC.restitution}>
                          <input type="text" value={formData.restitution_pickup_city}
                            onChange={e => setFormData(p => ({ ...p, restitution_pickup_city: e.target.value }))}
                            required className={inputCls} style={inputStyle} />
                        </Field>
                      </div>
                    </div>
                    <Field label="Contact" color={SEC.restitution}>
                      <input type="text" value={formData.restitution_pickup_contact_name}
                        onChange={e => setFormData(p => ({ ...p, restitution_pickup_contact_name: e.target.value }))}
                        placeholder="Contact sur place" className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Téléphone" color={SEC.restitution}>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.restitution}60` }} />
                        <input type="tel" value={formData.restitution_pickup_contact_phone}
                          onChange={e => setFormData(p => ({ ...p, restitution_pickup_contact_phone: e.target.value }))}
                          className={inputCls + " pl-11"} style={inputStyle} />
                      </div>
                    </Field>
                  </div>
                )}
              </div>

              {/* Date restitution */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: SEC.restitution }} />
                  <span className="text-sm font-bold" style={{ color: SEC.restitution }}>Date de restitution</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date" required color={SEC.restitution}>
                    <input type="date" value={formData.restitution_pickup_date}
                      onChange={e => setFormData(p => ({ ...p, restitution_pickup_date: e.target.value }))}
                      required className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Heure" color={SEC.restitution}>
                    <input type="time" value={formData.restitution_pickup_time}
                      onChange={e => setFormData(p => ({ ...p, restitution_pickup_time: e.target.value }))}
                      className={inputCls} style={inputStyle} />
                  </Field>
                </div>
              </div>

              {/* Livraison restitution */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: SEC.restitution }} />
                  <span className="text-sm font-bold" style={{ color: SEC.restitution }}>Livraison restitution</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date livraison" color={SEC.restitution}>
                    <input type="date" value={formData.restitution_delivery_date}
                      onChange={e => setFormData(p => ({ ...p, restitution_delivery_date: e.target.value }))}
                      className={inputCls} style={inputStyle} />
                  </Field>
                  <Field label="Heure livraison" color={SEC.restitution}>
                    <input type="time" value={formData.restitution_delivery_time}
                      onChange={e => setFormData(p => ({ ...p, restitution_delivery_time: e.target.value }))}
                      className={inputCls} style={inputStyle} />
                  </Field>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={formData.restitution_delivery_same_as_pickup}
                    onChange={e => setFormData(p => ({ ...p, restitution_delivery_same_as_pickup: e.target.checked }))}
                    className="w-4 h-4 rounded" style={{ accentColor: SEC.restitution }} />
                  <span className="text-sm font-medium" style={{ color: T.textSecondary }}>Même adresse que l'enlèvement</span>
                </label>
                {!formData.restitution_delivery_same_as_pickup && (
                  <div className="space-y-3 animate-fadeIn">
                    <AddressAutocompleteField label="Adresse" value={formData.restitution_delivery_address} color={SEC.restitution}
                      onChange={v => setFormData(p => ({ ...p, restitution_delivery_address: v }))}
                      onSelect={s => setFormData(p => ({ ...p, restitution_delivery_address: s.name, restitution_delivery_city: s.city, restitution_delivery_postcode: s.postcode, restitution_delivery_lat: s.latitude, restitution_delivery_lng: s.longitude }))}
                      placeholder="Adresse de livraison restitution..." required />
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <Field label="Code postal" color={SEC.restitution}>
                          <input type="text" value={formData.restitution_delivery_postcode}
                            onChange={e => setFormData(p => ({ ...p, restitution_delivery_postcode: e.target.value }))}
                            className={inputCls} style={inputStyle} />
                        </Field>
                      </div>
                      <div className="col-span-3">
                        <Field label="Ville" required color={SEC.restitution}>
                          <input type="text" value={formData.restitution_delivery_city}
                            onChange={e => setFormData(p => ({ ...p, restitution_delivery_city: e.target.value }))}
                            required className={inputCls} style={inputStyle} />
                        </Field>
                      </div>
                    </div>
                    <Field label="Contact" color={SEC.restitution}>
                      <input type="text" value={formData.restitution_delivery_contact_name}
                        onChange={e => setFormData(p => ({ ...p, restitution_delivery_contact_name: e.target.value }))}
                        placeholder="Contact sur place" className={inputCls} style={inputStyle} />
                    </Field>
                    <Field label="Téléphone" color={SEC.restitution}>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${SEC.restitution}60` }} />
                        <input type="tel" value={formData.restitution_delivery_contact_phone}
                          onChange={e => setFormData(p => ({ ...p, restitution_delivery_contact_phone: e.target.value }))}
                          className={inputCls + " pl-11"} style={inputStyle} />
                      </div>
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Route preview */}
      {(formData.pickup_city || formData.delivery_city) && (
        <div className="rounded-2xl p-4 lg:p-5" style={{ backgroundColor: T.cardBg, border: `1px solid ${T.borderDefault}`, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-4 h-4" style={{ color: T.primaryTeal }} />
            <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Aperçu de l'itinéraire</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.accentGreen}, ${T.accentGreen}AA)`, boxShadow: `0 2px 6px ${T.accentGreen}30` }}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="w-0.5 h-6 my-1" style={{ background: `linear-gradient(to bottom, ${T.accentGreen}, ${T.primaryBlue})` }} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryBlue}AA)`, boxShadow: `0 2px 6px ${T.primaryBlue}30` }}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: T.accentGreen }}>DÉPART</p>
                <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                  {formData.pickup_location_name || formData.pickup_city || formData.pickup_address || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: T.primaryBlue }}>ARRIVÉE</p>
                <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                  {formData.delivery_location_name || formData.delivery_city || formData.delivery_address || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: T.lightBg }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out; }
      `}</style>

      {/* ── Sticky AppBar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center gap-3">
          <button onClick={() => navigate('/team-missions')} className="p-2 rounded-xl hover:bg-[#F8FAFC] transition">
            <X className="w-5 h-5" style={{ color: T.textSecondary }} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg lg:text-xl font-bold" style={{ color: T.textPrimary }}>Nouvelle mission</h1>
            <p className="hidden lg:block text-xs mt-0.5" style={{ color: T.textSecondary }}>
              {STEPS[currentStep].description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: `linear-gradient(135deg, ${STEPS[currentStep].color}15, ${STEPS[currentStep].color}08)`, color: STEPS[currentStep].color, border: `1px solid ${STEPS[currentStep].color}25` }}>
              Étape {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>

        {/* ── Stepper ── */}
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-4">
          <div className="flex items-stretch gap-0">
            {STEPS.map((s, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={i} className="flex items-center flex-1">
                  <div className="flex-1">
                    {/* Progress bar */}
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${T.borderDefault}50` }}>
                      <div className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: done ? '100%' : active ? '50%' : '0%',
                          background: i <= currentStep ? `linear-gradient(90deg, ${s.color}, ${s.color}BB)` : T.borderDefault,
                        }} />
                    </div>
                    <button type="button" onClick={() => { if (done) setCurrentStep(i); }}
                      className="flex items-center gap-2 mt-2 mx-auto justify-center transition-all"
                      style={{ cursor: done ? 'pointer' : 'default', opacity: i <= currentStep ? 1 : 0.4 }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                        style={{
                          backgroundColor: done ? s.color : active ? `${s.color}15` : `${T.borderDefault}50`,
                          color: done ? '#fff' : active ? s.color : T.textTertiary,
                          border: active ? `2px solid ${s.color}` : 'none',
                          boxShadow: done ? `0 2px 6px ${s.color}30` : 'none',
                        }}>
                        {done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5">
                        <s.icon className="w-3.5 h-3.5" style={{ color: i <= currentStep ? s.color : T.textTertiary }} />
                        <span className="text-xs font-semibold" style={{ color: i <= currentStep ? s.color : T.textTertiary }}>{s.label}</span>
                      </div>
                    </button>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-3 lg:w-6 h-px mx-1" style={{ backgroundColor: done ? STEPS[i+1].color : T.borderDefault }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-5 lg:py-8 pb-36">
        {/* Credits banner */}
        <div className="rounded-2xl p-4 lg:p-5 mb-5 lg:mb-6 flex items-center justify-between" style={{
          background: `linear-gradient(135deg, ${T.accentAmber}08, ${T.accentAmber}04)`,
          border: `1px solid ${T.accentAmber}25`,
        }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-lg"
              style={{ background: `linear-gradient(135deg, ${T.accentAmber}, ${T.accentAmber}CC)`, boxShadow: `0 3px 10px ${T.accentAmber}30` }}>
              {credits}
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: T.textPrimary }}>Crédits disponibles</p>
              <p className="text-xs" style={{ color: T.textSecondary }}>
                {requiredCredits} crédit{requiredCredits > 1 ? 's' : ''} pour cette mission{formData.has_restitution ? ' + restitution' : ''}
              </p>
            </div>
          </div>
          {credits === 0 && (
            <button type="button" onClick={() => setShowBuyCreditModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition hover:shadow-lg"
              style={{ backgroundColor: T.accentAmber, boxShadow: `0 2px 8px ${T.accentAmber}30` }}>
              Recharger
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ backgroundColor: `${T.accentRed}08`, border: `1px solid ${T.accentRed}25` }}>
            <X className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: T.accentRed }} />
            <p className="text-sm font-medium" style={{ color: T.accentRed }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="min-h-[500px] lg:min-h-[400px]">
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </div>
        </form>
      </div>

      {/* ── Bottom nav bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t z-30" style={{ borderColor: T.borderDefault, boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }}>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-3 lg:py-4 flex gap-3 items-center">
          {currentStep > 0 && (
            <button type="button" onClick={handlePrevious}
              className="flex-1 lg:flex-none lg:w-44 px-5 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:bg-[#F8FAFC]"
              style={{ border: `2px solid ${T.borderDefault}`, color: T.textSecondary }}>
              <ChevronLeft className="w-4 h-4" />Précédent
            </button>
          )}
          <div className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            <span className="text-xs" style={{ color: T.textTertiary }}>
              {currentStep === 0 ? 'Renseignez le donneur d\'ordre et le véhicule' :
               currentStep === 1 ? 'Renseignez le lieu d\'enlèvement' :
               'Renseignez la livraison et les options'}
            </span>
          </div>
          {currentStep < totalSteps - 1 ? (
            <button type="button" onClick={handleNext} disabled={!canProceed()}
              className="flex-1 lg:flex-none lg:w-52 px-5 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:shadow-lg"
              style={{ background: canProceed() ? `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryBlue}DD)` : T.borderDefault, boxShadow: canProceed() ? `0 4px 14px ${T.primaryBlue}30` : 'none' }}>
              Continuer<ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="submit" onClick={handleSubmit} disabled={loading || !hasEnoughCredits(requiredCredits) || !canProceed()}
              className="flex-1 lg:flex-none lg:w-52 px-5 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 hover:shadow-lg"
              style={{ background: canProceed() ? `linear-gradient(135deg, ${T.accentGreen}, #059669)` : T.borderDefault, boxShadow: canProceed() ? `0 4px 14px ${T.accentGreen}30` : 'none' }}>
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</>
              ) : (
                <><CheckCircle className="w-4 h-4" />Créer la mission</>
              )}
            </button>
          )}
        </div>
      </div>

      {showBuyCreditModal && <BuyCreditModal isOpen={showBuyCreditModal} onClose={() => setShowBuyCreditModal(false)} />}
    </div>
  );
}
