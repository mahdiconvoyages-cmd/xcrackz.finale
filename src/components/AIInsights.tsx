import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, AlertCircle, X, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { suggestOptimizations, detectAnomalies } from '../services/aiService';

interface Insight {
  id: string;
  type: 'suggestion' | 'anomaly';
  severity?: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation?: string;
  status: 'active' | 'dismissed' | 'resolved';
}

export default function AIInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    loadInsights();

    // Auto-refresh toutes les 5 minutes
    const interval = setInterval(() => {
      refreshInsights();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const loadInsights = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Charger depuis BDD d'abord
      const { data: existing } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (existing && existing.length > 0) {
        setInsights(existing);
        setLastUpdate(new Date(existing[0].created_at));
      } else {
        // Si vide, générer nouveaux insights
        await generateNewInsights();
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    if (!user) return;

    try {
      // Charger données pour analyse
      const [missionsRes, vehiclesRes, invoicesRes] = await Promise.all([
        supabase.from('missions').select('*').eq('user_id', user.id).limit(50),
        supabase.from('contacts').select('*').eq('user_id', user.id).eq('is_driver', true),
        supabase.from('invoices').select('*').eq('user_id', user.id).limit(30),
      ]);

      const data = {
        missions: missionsRes.data || [],
        drivers: vehiclesRes.data || [],
        invoices: invoicesRes.data || [],
      };

      // Obtenir suggestions
      const suggestions = await suggestOptimizations(data);

      // Obtenir anomalies
      const anomalies = await detectAnomalies(data);

      // Sauvegarder en BDD
      const insightsToSave = [
        ...suggestions.map(s => ({
          user_id: user.id,
          type: 'suggestion' as const,
          title: 'Suggestion d\'optimisation',
          description: s,
          status: 'active' as const,
        })),
        ...anomalies.map(a => ({
          user_id: user.id,
          type: 'anomaly' as const,
          severity: a.severity,
          title: a.description,
          description: a.description,
          recommendation: a.recommendation,
          status: 'active' as const,
        })),
      ];

      if (insightsToSave.length > 0) {
        await supabase.from('ai_insights').insert(insightsToSave);
      }

      // Recharger
      await loadInsights();
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    await generateNewInsights();
    setRefreshing(false);
  };

  const dismissInsight = async (id: string) => {
    await supabase
      .from('ai_insights')
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
      .eq('id', id);

    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const markAsResolved = async (id: string) => {
    await supabase
      .from('ai_insights')
      .update({ status: 'resolved' })
      .eq('id', id);

    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const suggestions = insights.filter(i => i.type === 'suggestion');
  const anomalies = insights.filter(i => i.type === 'anomaly');

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        <div className="bg-slate-200 rounded-2xl h-64"></div>
        <div className="bg-slate-200 rounded-2xl h-64"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-500" />
            Insights IA
          </h2>
          {lastUpdate && (
            <p className="text-sm text-slate-600 mt-1">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
        <button
          onClick={refreshInsights}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">Actualiser</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suggestions */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Suggestions ({suggestions.length})
            </h3>
          </div>

          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p className="text-sm">Aucune suggestion pour le moment</p>
              <button
                onClick={refreshInsights}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Générer des suggestions
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 group hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {suggestion.description}
                      </p>
                      {suggestion.recommendation && (
                        <p className="text-xs text-blue-600 mt-2 pl-3 border-l-2 border-blue-400">
                          💡 {suggestion.recommendation}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => markAsResolved(suggestion.id)}
                        className="p-1.5 hover:bg-emerald-100 rounded-lg transition"
                        title="Marquer comme résolu"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => dismissInsight(suggestion.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition"
                        title="Ignorer"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Anomalies */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Anomalies ({anomalies.length})
            </h3>
          </div>

          {anomalies.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-600">Aucune anomalie détectée ✅</p>
              <p className="text-xs text-slate-500 mt-1">Tout fonctionne normalement</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {anomalies.map((anomaly) => (
                <div key={anomaly.id} className="bg-white rounded-xl p-4 shadow-sm border border-red-100 group hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${
                      anomaly.severity === 'high'
                        ? 'bg-red-600 text-white'
                        : anomaly.severity === 'medium'
                        ? 'bg-orange-500 text-white'
                        : 'bg-yellow-500 text-slate-800'
                    }`}>
                      {anomaly.severity?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 mb-1">
                        {anomaly.title}
                      </p>
                      <p className="text-xs text-slate-600">
                        {anomaly.description}
                      </p>
                      {anomaly.recommendation && (
                        <p className="text-xs text-orange-600 mt-2 pl-3 border-l-2 border-orange-400">
                          💡 {anomaly.recommendation}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => markAsResolved(anomaly.id)}
                        className="p-1.5 hover:bg-emerald-100 rounded-lg transition"
                        title="Marquer comme résolu"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </button>
                      <button
                        onClick={() => dismissInsight(anomaly.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition"
                        title="Ignorer"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-blue-800 mb-1">À propos des insights IA</p>
            <p>Les suggestions et anomalies sont générées automatiquement par DeepSeek V3 en analysant vos données. Elles sont actualisées toutes les 5 minutes et peuvent vous aider à optimiser votre activité.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
