import { useState, useEffect } from 'react';
import { X, Copy, Save, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { 
  PricingGrid, 
  VehicleType,
  createPricingGrid,
  updatePricingGrid,
  getGlobalPricingGrid,
  getDefaultGridTemplate,
  copyGrid
} from '../services/pricingGridService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';

interface PricingGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  existingGrid?: PricingGrid;
  onSuccess?: () => void;
}

export default function PricingGridModal({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName,
  existingGrid,
  onSuccess 
}: PricingGridModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('light');
  const [formData, setFormData] = useState<Partial<PricingGrid>>(getDefaultGridTemplate());

  useEffect(() => {
    if (existingGrid) {
      setFormData(existingGrid);
    } else {
      setFormData(getDefaultGridTemplate());
    }
  }, [existingGrid]);

  const handleCopyFromGlobal = async () => {
    if (!user) return;

    try {
      const globalGrid = await getGlobalPricingGrid(user.id);
      if (!globalGrid) {
        toast.error('Aucune grille globale trouvée');
        return;
      }

      const copiedGrid = copyGrid(globalGrid, clientId);
      setFormData(copiedGrid);
      toast.success('Grille globale copiée avec succès!');
    } catch (error) {
      console.error('Error copying global grid:', error);
      toast.error('Erreur lors de la copie');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Le nom de la grille est requis');
      return;
    }

    setLoading(true);
    try {
      const gridData = {
        ...formData,
        user_id: user.id,
        client_id: clientId || null,
        is_global: !clientId,
      };

      if (existingGrid) {
        // Update
        await updatePricingGrid(existingGrid.id, gridData);
        toast.success('Grille mise à jour avec succès!');
      } else {
        // Create
        await createPricingGrid(gridData);
        toast.success('Grille créée avec succès!');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving pricing grid:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof PricingGrid, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const vehicleTypes = [
    { value: 'light', label: 'Véhicule Léger', icon: '🚗' },
    { value: 'utility', label: 'Utilitaire', icon: '🚐' },
    { value: 'heavy', label: 'Poids Lourd', icon: '🚛' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                <DollarSign className="w-7 h-7" />
                {existingGrid ? 'Modifier' : 'Créer'} Grille Tarifaire
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {clientName ? `Client: ${clientName}` : 'Grille Globale (par défaut)'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Nom de la grille */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Nom de la grille *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Ex: Grille Standard, Tarifs Premium..."
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* Sélection type de véhicule */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Type de véhicule
            </label>
            <div className="grid grid-cols-3 gap-3">
              {vehicleTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedVehicleType(type.value as VehicleType)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedVehicleType === type.value
                      ? 'bg-blue-50 border-blue-500 shadow-lg'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <div className={`text-sm font-bold ${
                    selectedVehicleType === type.value ? 'text-blue-700' : 'text-slate-700'
                  }`}>
                    {type.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Paliers tarifaires */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              💰 Paliers de Distance - {vehicleTypes.find(t => t.value === selectedVehicleType)?.label}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 1-50km */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  1 à 50 km (forfait HT)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={Number(formData[`tier_1_50_${selectedVehicleType}` as keyof PricingGrid] || 0)}
                    onChange={(e) => updateField(`tier_1_50_${selectedVehicleType}`, parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pr-8 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
                </div>
              </div>

              {/* 51-100km */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  51 à 100 km (forfait HT)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={Number(formData[`tier_51_100_${selectedVehicleType}` as keyof PricingGrid] || 0)}
                    onChange={(e) => updateField(`tier_51_100_${selectedVehicleType}`, parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pr-8 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
                </div>
              </div>

              {/* 101-150km */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  101 à 150 km (forfait HT)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={Number(formData[`tier_101_150_${selectedVehicleType}` as keyof PricingGrid] || 0)}
                    onChange={(e) => updateField(`tier_101_150_${selectedVehicleType}`, parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pr-8 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
                </div>
              </div>

              {/* 151-300km */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  151 à 300 km (forfait HT)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={Number(formData[`tier_151_300_${selectedVehicleType}` as keyof PricingGrid] || 0)}
                    onChange={(e) => updateField(`tier_151_300_${selectedVehicleType}`, parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pr-8 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
                </div>
              </div>

              {/* 301+ km */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  301 km et + (tarif au kilomètre)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={Number(formData[`rate_per_km_${selectedVehicleType}` as keyof PricingGrid] || 0)}
                    onChange={(e) => updateField(`rate_per_km_${selectedVehicleType}`, parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pr-14 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€/km</span>
                </div>
              </div>
            </div>
          </div>

          {/* Marges et suppléments */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-600" />
              Marges & Suppléments
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Marge % */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Marge (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.margin_percentage || 0}
                    onChange={(e) => updateField('margin_percentage', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pr-8 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
                </div>
              </div>

              {/* Supplément fixe */}
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Supplément fixe (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fixed_supplement || 0}
                    onChange={(e) => updateField('fixed_supplement', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 pr-8 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
                </div>
              </div>
            </div>

            {/* Notes suppléments */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Notes (péage, urgence, etc.)
              </label>
              <textarea
                value={formData.supplement_notes || ''}
                onChange={(e) => updateField('supplement_notes', e.target.value)}
                placeholder="Ex: Péage A6, Livraison urgente, Zone difficile d'accès..."
                rows={2}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
              />
            </div>
          </div>

          {/* TVA */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Taux de TVA (%)
            </label>
            <div className="relative max-w-xs">
              <input
                type="number"
                step="0.01"
                value={formData.vat_rate || 20}
                onChange={(e) => updateField('vat_rate', parseFloat(e.target.value) || 20)}
                className="w-full px-4 py-3 pr-8 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">💡 Astuce</p>
              <p>Les tarifs configurés ici seront automatiquement appliqués lors de la création de devis pour ce client. Vous pouvez les modifier à tout moment.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-2xl flex gap-3">
          {clientId && (
            <button
              onClick={handleCopyFromGlobal}
              className="px-6 py-3 border-2 border-blue-300 text-blue-700 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center gap-2"
            >
              <Copy className="w-5 h-5" />
              Copier depuis grille globale
            </button>
          )}
          
          <div className="flex-1"></div>
          
          <button
            onClick={onClose}
            className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            Annuler
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Sauvegarder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
