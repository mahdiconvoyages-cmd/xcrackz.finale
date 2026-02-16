import { useEffect, useState } from 'react';
import { X, MapPin, Clock, Star, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { getRecommendedDrivers, assignDriverToMission, type DriverRecommendation, type MissionRequirements } from '../services/driverRecommendation';
import RippleButton from './RippleButton';

interface AssignDriverModalProps {
  missionId: string;
  requirements: MissionRequirements;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignDriverModal({
  missionId,
  requirements,
  onClose,
  onAssigned,
}: AssignDriverModalProps) {
  const [recommendations, setRecommendations] = useState<DriverRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const results = await getRecommendedDrivers(requirements);
      setRecommendations(results);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (recommendation: DriverRecommendation) => {
    setAssigning(true);
    setSelectedDriverId(recommendation.contact.id);

    try {
      const success = await assignDriverToMission(
        missionId,
        recommendation.contact.id,
        recommendation
      );

      if (success) {
        onAssigned();
        onClose();
      } else {
        alert('Erreur lors de l\'assignation du chauffeur');
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Erreur lors de l\'assignation du chauffeur');
    } finally {
      setAssigning(false);
      setSelectedDriverId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-blue-500 to-cyan-500';
    if (score >= 40) return 'from-orange-500 to-amber-500';
    return 'from-red-500 to-rose-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Moyen';
    return 'Faible';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Assigner un chauffeur</h2>
            <p className="text-slate-600 mt-1">Chauffeurs recommandés par ordre de pertinence</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-semibold mb-2">Aucun chauffeur disponible</p>
              <p className="text-slate-500">
                Aucun chauffeur n'a été trouvé pour cette mission. Vérifiez que vous avez ajouté des contacts chauffeurs.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <div
                  key={recommendation.contact.id}
                  className="bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 rounded-xl p-6 hover:border-teal-500 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                          {recommendation.contact.name.charAt(0).toUpperCase()}
                        </div>
                        {index === 0 && (
                          <div className="mt-2 flex items-center justify-center">
                            <Award className="w-5 h-5 text-yellow-500" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-slate-900">{recommendation.contact.name}</h3>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-700 text-xs font-semibold rounded-full">
                              Meilleur choix
                            </span>
                          )}
                        </div>

                        <p className="text-slate-600 text-sm mb-3">{recommendation.reason}</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          {recommendation.distanceKm !== null && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <div>
                                <p className="text-xs text-slate-500">Distance</p>
                                <p className="text-sm font-semibold text-slate-900">{recommendation.distanceKm.toFixed(1)} km</p>
                              </div>
                            </div>
                          )}

                          {recommendation.etaMinutes !== null && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <div>
                                <p className="text-xs text-slate-500">ETA</p>
                                <p className="text-sm font-semibold text-slate-900">{recommendation.etaMinutes} min</p>
                              </div>
                            </div>
                          )}

                          {recommendation.contact.missions_completed > 0 && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-slate-500" />
                              <div>
                                <p className="text-xs text-slate-500">Missions</p>
                                <p className="text-sm font-semibold text-slate-900">{recommendation.contact.missions_completed}</p>
                              </div>
                            </div>
                          )}

                          {recommendation.contact.rating_average > 0 && (
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <div>
                                <p className="text-xs text-slate-500">Note</p>
                                <p className="text-sm font-semibold text-slate-900">{recommendation.contact.rating_average.toFixed(1)}/5</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-600">Permis:</span>
                          {recommendation.contact.driver_licenses.length > 0 ? (
                            recommendation.contact.driver_licenses.map((license) => (
                              <span
                                key={license}
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  requirements.requiredLicense === license
                                    ? 'bg-teal-500/20 text-teal-700 ring-2 ring-teal-500'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {license}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Aucun</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="text-right">
                        <div className={`text-3xl font-bold bg-gradient-to-r ${getScoreColor(recommendation.totalScore)} bg-clip-text text-transparent mb-1`}>
                          {Math.round(recommendation.totalScore)}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          {getScoreLabel(recommendation.totalScore)}
                        </div>
                      </div>

                      <div className="w-32">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getScoreColor(recommendation.totalScore)} transition-all`}
                            style={{ width: `${recommendation.totalScore}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
                          <div className="text-center">
                            <div className="font-semibold text-slate-700">{Math.round(recommendation.proximityScore)}</div>
                            <div className="text-slate-500 text-[10px]">Dist</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-slate-700">{Math.round(recommendation.availabilityScore)}</div>
                            <div className="text-slate-500 text-[10px]">Dispo</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-slate-700">{Math.round(recommendation.licenseScore)}</div>
                            <div className="text-slate-500 text-[10px]">Permis</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-slate-700">{Math.round(recommendation.historyScore)}</div>
                            <div className="text-slate-500 text-[10px]">Hist</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                    <div className="flex-1 flex items-center gap-2">
                      {recommendation.contact.email && (
                        <a
                          href={`mailto:${recommendation.contact.email}`}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          {recommendation.contact.email}
                        </a>
                      )}
                      {recommendation.contact.phone && (
                        <>
                          {recommendation.contact.email && <span className="text-slate-400">•</span>}
                          <a
                            href={`tel:${recommendation.contact.phone}`}
                            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                          >
                            {recommendation.contact.phone}
                          </a>
                        </>
                      )}
                    </div>

                    <RippleButton
                      onClick={() => handleAssign(recommendation)}
                      disabled={assigning}
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assigning && selectedDriverId === recommendation.contact.id ? 'Assignation...' : 'Assigner'}
                    </RippleButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
              <span>Excellent (80+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"></div>
              <span>Bon (60-79)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500"></div>
              <span>Moyen (40-59)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-rose-500"></div>
              <span>Faible (&lt;40)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
