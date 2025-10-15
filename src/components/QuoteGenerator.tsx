import { useState } from 'react';
import { X, MapPin, Loader2, Calculator, Download, TrendingUp, DollarSign, FileText, CheckCircle2 } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';
import { calculateDistance } from '../services/mapboxService';
import { calculateQuote, getApplicableGrid, VehicleType, QuoteCalculation, PricingGrid } from '../services/pricingGridService';
import { generateQuotePDF } from '../services/pdfService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import { supabase } from '../lib/supabase';

interface QuoteGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  onQuoteGenerated?: (quote: QuoteCalculation & { distance: number }) => void;
}

export default function QuoteGenerator({
  isOpen,
  onClose,
  clientId,
  clientName,
  onQuoteGenerated
}: QuoteGeneratorProps) {
  const { user } = useAuth();

  // Form states
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('light');

  // Calculation states
  const [calculating, setCalculating] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [quote, setQuote] = useState<QuoteCalculation | null>(null);
  const [grid, setGrid] = useState<PricingGrid | null>(null);

  // Calculate distance using Mapbox
  const handleCalculateDistance = async () => {
    if (!fromAddress || !toAddress) {
      toast.error('Veuillez saisir les deux adresses');
      return;
    }

    setCalculating(true);
    try {
      const result = await calculateDistance(fromAddress, toAddress);
      setDistance(result.distance_km);
      setDuration(result.duration_minutes);
      toast.success(`Distance calculée: ${result.distance_km} km`);
    } catch (error) {
      console.error('Error calculating distance:', error);
      toast.error('Erreur lors du calcul de distance');
    } finally {
      setCalculating(false);
    }
  };

  // Generate quote
  const handleGenerateQuote = async () => {
    if (!user || distance === null) {
      toast.error('Calculez d\'abord la distance');
      return;
    }

    setCalculating(true);
    try {
      // Get applicable pricing grid
      const applicableGrid = await getApplicableGrid(user.id, clientId);
      
      if (!applicableGrid) {
        toast.error('Aucune grille tarifaire trouvée. Créez une grille globale ou client.');
        setCalculating(false);
        return;
      }

      setGrid(applicableGrid);

      // Calculate quote
      const calculation = calculateQuote({
        distance,
        vehicleType,
        grid: applicableGrid
      });

      setQuote(calculation);
      onQuoteGenerated?.({ ...calculation, distance });
      toast.success('Devis généré avec succès!');
    } catch (error) {
      console.error('Error generating quote:', error);
      toast.error('Erreur lors de la génération du devis');
    } finally {
      setCalculating(false);
    }
  };

  const resetForm = () => {
    setFromAddress('');
    setToAddress('');
    setVehicleType('light');
    setDistance(null);
    setDuration(null);
    setQuote(null);
    setGrid(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const vehicleTypes = [
    { value: 'light', label: 'Véhicule Léger', icon: '🚗', color: 'blue' },
    { value: 'utility', label: 'Utilitaire', icon: '🚐', color: 'green' },
    { value: 'heavy', label: 'Poids Lourd', icon: '🚛', color: 'orange' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Calculator className="w-7 h-7" />
                Générateur de Devis
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {clientName ? `Client: ${clientName}` : 'Nouveau devis'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Adresses */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Étape 1 : Adresses de départ et d'arrivée
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Address avec Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Adresse de départ
                </label>
                <AddressAutocomplete
                  value={fromAddress}
                  onChange={(address) => setFromAddress(address)}
                  placeholder="Ex: 10 Rue de Rivoli, Paris"
                  required
                />
              </div>

              {/* To Address avec Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Adresse d'arrivée
                </label>
                <AddressAutocomplete
                  value={toAddress}
                  onChange={(address) => setToAddress(address)}
                  placeholder="Ex: Tour Eiffel, Paris"
                  required
                />
              </div>
            </div>

            <button
              onClick={handleCalculateDistance}
              disabled={calculating || !fromAddress || !toAddress}
              className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Calcul en cours...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Calculer la distance
                </>
              )}
            </button>

            {distance !== null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                  <div className="text-sm text-slate-600 font-semibold mb-1">Distance</div>
                  <div className="text-3xl font-black text-blue-700">{distance} km</div>
                </div>
                <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                  <div className="text-sm text-slate-600 font-semibold mb-1">Durée estimée</div>
                  <div className="text-3xl font-black text-blue-700">{duration} min</div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Type de véhicule */}
          {distance !== null && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Étape 2 : Type de véhicule
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {vehicleTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setVehicleType(type.value as VehicleType)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      vehicleType === type.value
                        ? `bg-${type.color}-50 border-${type.color}-500 shadow-lg`
                        : 'bg-white border-slate-200 hover:border-green-300'
                    }`}
                  >
                    <div className="text-4xl mb-2">{type.icon}</div>
                    <div className={`text-sm font-bold ${
                      vehicleType === type.value ? `text-${type.color}-700` : 'text-slate-700'
                    }`}>
                      {type.label}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerateQuote}
                disabled={calculating}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {calculating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Générer le devis
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Résultat */}
          {quote && grid && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Devis Généré
              </h3>

              {/* Détail calcul */}
              <div className="bg-white rounded-lg p-6 mb-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-sm">
                    <span className="text-slate-600 font-semibold">Grille tarifaire:</span>
                    <div className="font-bold text-slate-900 mt-1">{grid.name}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-600 font-semibold">Palier appliqué:</span>
                    <div className="font-bold text-slate-900 mt-1">{quote.tier}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-700">Distance parcourue</span>
                    <span className="font-bold">{distance} km</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-700">Prix de base HT</span>
                    <span className="font-bold">{quote.basePrice.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-700">Marge ({quote.marginPercentage}%)</span>
                    <span className="font-bold">+ {quote.marginAmount.toFixed(2)} €</span>
                  </div>
                  {quote.fixedSupplement > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-700">Supplément fixe</span>
                      <span className="font-bold">+ {quote.fixedSupplement.toFixed(2)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-3 mt-3">
                    <span className="font-bold text-blue-900 text-base">TOTAL HT</span>
                    <span className="font-black text-blue-900 text-xl">{quote.totalHT.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-700">TVA ({quote.vatRate}%)</span>
                    <span className="font-bold">+ {quote.vatAmount.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg px-4 mt-2">
                    <span className="font-black text-lg">TOTAL TTC</span>
                    <span className="font-black text-2xl">{quote.totalTTC.toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              {/* Formule */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-xs font-bold text-blue-900 mb-2">📝 Détail du calcul :</div>
                <div className="text-xs text-blue-800 font-mono bg-white p-3 rounded border border-blue-200">
                  {quote.formula}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-2xl flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            Fermer
          </button>
          
          {quote && distance && (
            <button
              onClick={async () => {
                if (!user || !clientId || !clientName) {
                  toast.error('Informations client manquantes');
                  return;
                }

                try {
                  // Charger les infos client complètes
                  const { data: client } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', clientId)
                    .single();

                  if (!client) {
                    toast.error('Client non trouvé');
                    return;
                  }

                  // Générer PDF
                  generateQuotePDF({
                    quote,
                    distance,
                    client: {
                      name: client.name,
                      email: client.email,
                      phone: client.phone,
                      address: client.address,
                      siret: client.siret
                    },
                    user: {
                      email: user.email || 'contact@finality.fr'
                    },
                    fromAddress,
                    toAddress,
                    quoteNumber: `DEV-${Date.now()}`,
                    quoteDate: new Date()
                  });

                  toast.success('PDF téléchargé avec succès!');
                } catch (error) {
                  console.error('Error generating PDF:', error);
                  toast.error('Erreur lors de la génération du PDF');
                }
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Télécharger PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
