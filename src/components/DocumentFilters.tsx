import { Search, Filter, Calendar, X } from 'lucide-react';
import { useState } from 'react';

interface DocumentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  dateRange?: { start: string; end: string };
  onDateRangeChange?: (range: { start: string; end: string }) => void;
  showAdvanced?: boolean;
}

export default function DocumentFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  showAdvanced = false
}: DocumentFiltersProps) {
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  const statuses = [
    { value: 'all', label: 'Tous les statuts', color: 'slate' },
    { value: 'draft', label: 'Brouillon', color: 'slate' },
    { value: 'sent', label: 'Envoyé', color: 'blue' },
    { value: 'paid', label: 'Payé', color: 'green' },
    { value: 'overdue', label: 'En retard', color: 'red' },
    { value: 'cancelled', label: 'Annulé', color: 'gray' }
  ];

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
    if (onDateRangeChange) {
      onDateRangeChange({ start: '', end: '' });
    }
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || (dateRange?.start && dateRange?.end);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Recherche */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par numéro, client..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Filtre statut */}
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="pl-12 pr-8 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer min-w-[200px]"
          >
            {statuses.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre date (si showAdvanced) */}
        {showAdvanced && onDateRangeChange && (
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="px-6 py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition flex items-center gap-2 font-semibold text-slate-700"
            >
              <Calendar className="w-5 h-5" />
              Période
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-10 min-w-[300px]">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={dateRange?.start || ''}
                      onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value } as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={dateRange?.end || ''}
                      onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value } as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition font-semibold"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bouton réinitialiser */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition flex items-center gap-2 font-semibold"
          >
            <X className="w-5 h-5" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Filtres actifs */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {searchQuery && (
            <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold flex items-center gap-2">
              Recherche: "{searchQuery}"
              <button onClick={() => onSearchChange('')} className="hover:bg-teal-200 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {statusFilter !== 'all' && (
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold flex items-center gap-2">
              Statut: {statuses.find(s => s.value === statusFilter)?.label}
              <button onClick={() => onStatusFilterChange('all')} className="hover:bg-blue-200 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {dateRange?.start && dateRange?.end && (
            <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold flex items-center gap-2">
              Du {new Date(dateRange.start).toLocaleDateString('fr-FR')} au {new Date(dateRange.end).toLocaleDateString('fr-FR')}
              <button onClick={() => onDateRangeChange?.({ start: '', end: '' })} className="hover:bg-purple-200 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
