import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Users, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AccountAttempt {
  id: string;
  email: string;
  phone: string;
  ip_address: string;
  attempt_date: string;
  success: boolean;
  error_message: string;
  duplicate_detected: boolean;
}

interface SuspiciousAccount {
  id: string;
  email: string;
  phone: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  reviewed: boolean;
}

export default function AccountSecurity() {
  const [attempts, setAttempts] = useState<AccountAttempt[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'attempts' | 'suspicious'>('suspicious');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attemptsResult, suspiciousResult] = await Promise.all([
        supabase
          .from('account_creation_attempts')
          .select('*')
          .order('attempt_date', { ascending: false })
          .limit(100),
        supabase
          .from('suspicious_accounts')
          .select('*')
          .order('detected_at', { ascending: false })
          .limit(50),
      ]);

      if (attemptsResult.data) setAttempts(attemptsResult.data);
      if (suspiciousResult.data) setSuspicious(suspiciousResult.data);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSuspicious = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suspicious_accounts')
        .update({ reviewed: true, reviewed_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error reviewing suspicious account:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-600 border-red-500';
      case 'high':
        return 'bg-orange-500/20 text-orange-600 border-orange-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500';
      default:
        return 'bg-blue-500/20 text-blue-600 border-blue-500';
    }
  };

  const stats = {
    totalAttempts: attempts.length,
    successfulAttempts: attempts.filter((a) => a.success).length,
    duplicateAttempts: attempts.filter((a) => a.duplicate_detected).length,
    suspiciousCount: suspicious.filter((s) => !s.reviewed).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-sm mb-2">
          Sécurité des comptes
        </h1>
        <p className="text-slate-600 text-lg">
          Surveillance et prévention des comptes multiples
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-blue-600" />
            <h3 className="font-semibold text-slate-700">Tentatives</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.totalAttempts}</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-400/30 shadow-xl shadow-green-500/20 shadow-depth-lg rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h3 className="font-semibold text-slate-700">Succès</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.successfulAttempts}</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-400/30 shadow-xl shadow-orange-500/20 shadow-depth-lg rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-6 h-6 text-orange-600" />
            <h3 className="font-semibold text-slate-700">Doublons</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.duplicateAttempts}</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-red-500/10 via-rose-500/10 to-pink-500/10 border border-red-400/30 shadow-xl shadow-red-500/20 shadow-depth-lg rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold text-slate-700">Suspects</h3>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats.suspiciousCount}</p>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl p-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('suspicious')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === 'suspicious'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            Comptes suspects
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`px-6 py-2 rounded-lg font-semibold transition ${
              activeTab === 'attempts'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}
          >
            Toutes les tentatives
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : activeTab === 'suspicious' ? (
          <div className="space-y-4">
            {suspicious.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Aucun compte suspect détecté</p>
              </div>
            ) : (
              suspicious.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg p-4 border-2 ${
                    item.reviewed ? 'border-slate-200' : getSeverityColor(item.severity)
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityColor(
                            item.severity
                          )}`}
                        >
                          {item.severity.toUpperCase()}
                        </span>
                        {item.reviewed && (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-600 border border-green-500">
                            VÉRIFIÉ
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 mb-1">{item.email}</p>
                      {item.phone && (
                        <p className="text-sm text-slate-600 mb-2">{item.phone}</p>
                      )}
                      <p className="text-sm text-slate-700 mb-2">
                        <strong>Raison:</strong> {item.reason}
                      </p>
                      <p className="text-xs text-slate-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(item.detected_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    {!item.reviewed && (
                      <button
                        onClick={() => handleReviewSuspicious(item.id)}
                        className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition"
                      >
                        Marquer vérifié
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Aucune tentative enregistrée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Téléphone
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        IP
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">
                        Statut
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm">{attempt.email}</td>
                        <td className="py-3 px-4 text-sm">{attempt.phone || '-'}</td>
                        <td className="py-3 px-4 text-sm font-mono text-xs">
                          {attempt.ip_address}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {new Date(attempt.attempt_date).toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {attempt.success ? (
                              <span className="px-2 py-1 bg-green-500/20 text-green-600 text-xs font-semibold rounded">
                                Succès
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-500/20 text-red-600 text-xs font-semibold rounded">
                                Échec
                              </span>
                            )}
                            {attempt.duplicate_detected && (
                              <span className="px-2 py-1 bg-orange-500/20 text-orange-600 text-xs font-semibold rounded">
                                Doublon
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
