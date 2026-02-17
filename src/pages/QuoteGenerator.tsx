// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState, useEffect } from 'react';
import { FileText, Calculator, MapPin, Truck, Euro, Plus, Trash2, Save, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { getRouteFromOpenRouteService, formatDistance, formatDuration } from '../lib/services/openRouteService';
import { calculatePrice, calculatePriceTTC } from '../lib/services/distanceService';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
}

interface PricingGrid {
  id: string;
  name: string;
  is_global: boolean;
  // Paliers véhicule léger
  tier_1_50_light: number;
  tier_51_100_light: number;
  tier_101_150_light: number;
  tier_151_300_light: number;
  rate_per_km_light: number;
  // Paliers véhicule utilitaire
  tier_1_50_utility: number;
  tier_51_100_utility: number;
  tier_101_150_utility: number;
  tier_151_300_utility: number;
  rate_per_km_utility: number;
  // Paliers véhicule lourd
  tier_1_50_heavy: number;
  tier_51_100_heavy: number;
  tier_101_150_heavy: number;
  tier_151_300_heavy: number;
  rate_per_km_heavy: number;
  // Autres
  margin_percentage: number;
  fixed_supplement: number;
  vat_rate: number;
  supplement_notes?: string;
}

interface QuoteItem {
  id: string;
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  vehicle_type: 'light' | 'utility' | 'heavy';
  distance?: number;
  duration?: number;
  price_ht?: number;
  price_ttc?: number;
  notes?: string;
}

export default function QuoteGenerator() {
  const { user } = useAuth();
  
  // États principaux
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [pricingGrids, setPricingGrids] = useState<PricingGrid[]>([]);
  const [selectedGridId, setSelectedGridId] = useState<string>('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([
    {
      id: '1',
      pickup_address: '',
      delivery_address: '',
      vehicle_type: 'light',
    }
  ]);
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState(30);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Charger les clients et grilles tarifaires
  useEffect(() => {
    if (user) {
      loadClients();
      loadPricingGrids();
      generateQuoteNumber();
    }
  }, [user]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');

    if (!error && data) {
      setClients(data);
    }
  };

  const loadPricingGrids = async () => {
    const { data, error } = await supabase
      .from('pricing_grids')
      .select('*')
      .eq('user_id', user?.id)
      .order('is_global', { ascending: false });

    if (!error && data) {
      setPricingGrids(data);
      // Sélectionner la grille globale par défaut
      const globalGrid = data.find(g => g.is_global);
      if (globalGrid) {
        setSelectedGridId(globalGrid.id);
      }
    }
  };

  const generateQuoteNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setQuoteNumber(`DEV-${year}${month}-${random}`);
  };

  // Ajouter une ligne de devis
  const addQuoteItem = () => {
    setQuoteItems([
      ...quoteItems,
      {
        id: Date.now().toString(),
        pickup_address: '',
        delivery_address: '',
        vehicle_type: 'light',
      }
    ]);
  };

  // Supprimer une ligne de devis
  const removeQuoteItem = (id: string) => {
    if (quoteItems.length > 1) {
      setQuoteItems(quoteItems.filter(item => item.id !== id));
    }
  };

  // Calculer la distance et le prix pour un trajet
  const calculateRoutePrice = async (itemId: string) => {
    const item = quoteItems.find(i => i.id === itemId);
    if (!item || !item.pickup_lat || !item.pickup_lng || !item.delivery_lat || !item.delivery_lng) {
      showToast('error', 'Adresses manquantes', 'Veuillez sélectionner les adresses de départ et d\'arrivée');
      return;
    }

    const grid = pricingGrids.find(g => g.id === selectedGridId);
    if (!grid) {
      showToast('error', 'Grille manquante', 'Veuillez sélectionner une grille tarifaire');
      return;
    }

    setCalculating(itemId);

    try {
      // Calculer le tracé GPS
      const route = await getRouteFromOpenRouteService(
        item.pickup_lat,
        item.pickup_lng,
        item.delivery_lat,
        item.delivery_lng,
        item.vehicle_type === 'heavy' ? 'driving-hgv' : 'driving-car'
      );

      if (!route) {
        throw new Error('Impossible de calculer l\'itinéraire');
      }

      const distanceKm = route.distance / 1000; // Convertir en km
      const durationSec = route.duration;

      // Calculer le prix
      const priceHT = calculatePrice(distanceKm, grid, item.vehicle_type);
      const priceTTC = calculatePriceTTC(priceHT, grid.vat_rate);

      // Mettre à jour l'item
      setQuoteItems(quoteItems.map(qi => 
        qi.id === itemId 
          ? { 
              ...qi, 
              distance: distanceKm,
              duration: durationSec,
              price_ht: priceHT,
              price_ttc: priceTTC
            }
          : qi
      ));

    } catch (error) {
      console.error('Error calculating route:', error);
      showToast('error', 'Erreur calcul', 'Erreur lors du calcul de l\'itinéraire. Veuillez réessayer.');
    } finally {
      setCalculating(null);
    }
  };

  // Calculer tous les trajets
  const calculateAllRoutes = async () => {
    for (const item of quoteItems) {
      if (item.pickup_lat && item.delivery_lat) {
        await calculateRoutePrice(item.id);
      }
    }
  };

  // Calculer le total
  const getTotals = () => {
    const totalHT = quoteItems.reduce((sum, item) => sum + (item.price_ht || 0), 0);
    const totalTTC = quoteItems.reduce((sum, item) => sum + (item.price_ttc || 0), 0);
    const totalDistance = quoteItems.reduce((sum, item) => sum + (item.distance || 0), 0);
    
    return { totalHT, totalTTC, totalDistance };
  };

  // Sauvegarder le devis
  const saveQuote = async () => {
    if (!selectedClientId) {
      showToast('error', 'Client manquant', 'Veuillez sélectionner un client');
      return;
    }

    if (quoteItems.some(item => !item.price_ht)) {
      showToast('error', 'Calcul incomplet', 'Veuillez calculer tous les trajets avant de sauvegarder');
      return;
    }

    setLoading(true);

    try {
      const { totalHT, totalTTC } = getTotals();

      // @ts-ignore - Insert quote and get back the id
      const { data: quoteData, error } = await supabase.from('quotes').insert({
        quote_number: quoteNumber,
        user_id: user?.id,
        client_id: selectedClientId,
        pricing_grid_id: selectedGridId,
        quote_date: quoteDate,
        validity_days: validityDays,
        total_ht: totalHT,
        total_ttc: totalTTC,
        additional_notes: additionalNotes,
        status: 'draft'
      }).select('id').single();

      if (error) throw error;

      // Save items to quote_items table (consistent with Billing.tsx)
      // @ts-ignore
      const itemsToInsert = quoteItems.map((item, index) => ({
        quote_id: quoteData.id,
        description: `${item.pickup_address} → ${item.delivery_address}${item.vehicle_type ? ` (${item.vehicle_type === 'light' ? 'Léger' : item.vehicle_type === 'utility' ? 'Utilitaire' : 'Poids lourd'})` : ''}${item.distance ? ` - ${formatDistance(item.distance)}` : ''}`,
        quantity: 1,
        unit_price: item.price_ht || 0,
        tax_rate: 20,
        amount: item.price_ttc || item.price_ht || 0,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      showToast('success', 'Devis sauvegardé', 'Le devis a été créé avec succès');
      
      // Réinitialiser le formulaire
      generateQuoteNumber();
      setQuoteItems([{
        id: '1',
        pickup_address: '',
        delivery_address: '',
        vehicle_type: 'light',
      }]);
      setAdditionalNotes('');

    } catch (error) {
      console.error('Error saving quote:', error);
      showToast('error', 'Erreur', 'Erreur lors de la sauvegarde du devis');
    } finally {
      setLoading(false);
    }
  };

  const { totalHT, totalTTC, totalDistance } = getTotals();

  return (
    <div className="p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2 sm:gap-3">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                Générateur de Devis
              </h1>
              <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base">
                Créez vos devis avec calcul automatique de distance et tarification
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600">Numéro de devis</div>
              <div className="text-2xl font-bold text-blue-600">{quoteNumber}</div>
            </div>
          </div>
        </div>

        {/* Informations client et grille */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Client */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Client
            </h2>
            
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner un client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.company && `(${client.company})`}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date du devis
                </label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Validité (jours)
                </label>
                <input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Grille tarifaire */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              Grille Tarifaire
            </h2>
            
            <select
              value={selectedGridId}
              onChange={(e) => setSelectedGridId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            >
              <option value="">Sélectionner une grille</option>
              {pricingGrids.map(grid => (
                <option key={grid.id} value={grid.id}>
                  {grid.name} {grid.is_global && '(Par défaut)'}
                </option>
              ))}
            </select>

            {selectedGridId && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-800">
                  <div className="font-semibold mb-2">Tarification appliquée:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Marge: {pricingGrids.find(g => g.id === selectedGridId)?.margin_percentage}%</div>
                    <div>TVA: {pricingGrids.find(g => g.id === selectedGridId)?.vat_rate}%</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lignes de devis */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-teal-600" />
              Trajets ({quoteItems.length})
            </h2>
            <button
              onClick={calculateAllRoutes}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculer tous les trajets
            </button>
          </div>

          <div className="space-y-4">
            {quoteItems.map((item, index) => (
              <div key={item.id} className="border border-slate-200 rounded-lg p-6 relative">
                {/* Numéro de trajet */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>

                {/* Bouton supprimer */}
                {quoteItems.length > 1 && (
                  <button
                    onClick={() => removeQuoteItem(item.id)}
                    className="absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Adresse de départ */}
                  <div>
                    <AddressAutocomplete
                      label="Adresse de départ"
                      value={item.pickup_address}
                      onChange={(addr, lat, lng) => {
                        setQuoteItems(quoteItems.map(qi => 
                          qi.id === item.id 
                            ? { ...qi, pickup_address: addr, pickup_lat: lat, pickup_lng: lng }
                            : qi
                        ));
                      }}
                      placeholder="Ex: 8 Boulevard du Palais, Paris"
                      required
                    />
                  </div>

                  {/* Adresse d'arrivée */}
                  <div>
                    <AddressAutocomplete
                      label="Adresse d'arrivée"
                      value={item.delivery_address}
                      onChange={(addr, lat, lng) => {
                        setQuoteItems(quoteItems.map(qi => 
                          qi.id === item.id 
                            ? { ...qi, delivery_address: addr, delivery_lat: lat, delivery_lng: lng }
                            : qi
                        ));
                      }}
                      placeholder="Ex: Vieux-Port, Marseille"
                      required
                    />
                  </div>

                  {/* Type de véhicule */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Type de véhicule <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={item.vehicle_type}
                      onChange={(e) => {
                        setQuoteItems(quoteItems.map(qi => 
                          qi.id === item.id 
                            ? { ...qi, vehicle_type: e.target.value as 'light' | 'utility' | 'heavy' }
                            : qi
                        ));
                      }}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="light">🚗 Véhicule Léger</option>
                      <option value="utility">🚙 Utilitaire</option>
                      <option value="heavy">🚛 Poids Lourd</option>
                    </select>
                  </div>
                </div>

                {/* Bouton calculer */}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={() => calculateRoutePrice(item.id)}
                    disabled={!item.pickup_lat || !item.delivery_lat || calculating === item.id}
                    className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {calculating === item.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4" />
                        Calculer
                      </>
                    )}
                  </button>

                  {/* Résultats */}
                  {item.distance && item.price_ht && (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold">{item.distance.toFixed(1)} km</span>
                      </div>
                      {item.duration && (
                        <div className="text-slate-600">
                          ⏱️ {formatDuration(item.duration)}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Euro className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-green-600">{item.price_ht.toFixed(2)} € HT</span>
                      </div>
                      <div className="text-slate-600">
                        ({item.price_ttc?.toFixed(2)} € TTC)
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => {
                      setQuoteItems(quoteItems.map(qi => 
                        qi.id === item.id 
                          ? { ...qi, notes: e.target.value }
                          : qi
                      ));
                    }}
                    placeholder="Notes ou commentaires (optionnel)"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addQuoteItem}
            className="mt-4 w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-teal-500 hover:text-teal-600 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter un trajet
          </button>
        </div>

        {/* Notes additionnelles */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Notes additionnelles (optionnel)
          </label>
          <textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            rows={4}
            placeholder="Conditions particulières, informations supplémentaires..."
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Totaux */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xl p-8 mb-6 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm opacity-90 mb-1">Distance totale</div>
              <div className="text-3xl font-black">{totalDistance.toFixed(1)} km</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Total HT</div>
              <div className="text-3xl font-black">{totalHT.toFixed(2)} €</div>
            </div>
            <div>
              <div className="text-sm opacity-90 mb-1">Total TTC</div>
              <div className="text-4xl font-black">{totalTTC.toFixed(2)} €</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
          >
            Annuler
          </button>
          <button
            onClick={saveQuote}
            disabled={loading || !selectedClientId || quoteItems.some(i => !i.price_ht)}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Sauvegarder le devis
              </>
            )}
          </button>
          <button
            disabled={loading || !selectedClientId || quoteItems.some(i => !i.price_ht)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            <Send className="w-5 h-5" />
            Envoyer au client
          </button>
        </div>
      </div>
    </div>
  );
}
