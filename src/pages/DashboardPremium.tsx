// @ts-nocheck - Dashboard Premium - Reproduction exacte du Flutter
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Truck, Users, CheckCircle, TrendingUp, Calendar,
  Wallet, AlertTriangle, Plus, UserPlus, Camera,
  ChevronRight, User, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types
interface DashboardStats {
  activeMissions: number;
  completedMissions: number;
  totalMissions: number;
  totalContacts: number;
  completionRate: number;
}

interface CreditInfo {
  credits: number;
  plan: string;
  daysRemaining: number;
  endDate: Date | null;
  hasActiveSubscription: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

interface RecentActivity {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  color: string;
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: delay * 0.1, duration: 0.5, ease: "easeOut" }
  })
};

export default function DashboardPremium() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    activeMissions: 0,
    completedMissions: 0,
    totalMissions: 0,
    totalContacts: 0,
    completionRate: 0,
  });
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    credits: 0,
    plan: 'FREE',
    daysRemaining: 0,
    endDate: null,
    hasActiveSubscription: false,
    isExpiringSoon: false,
    isExpired: false,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${user.id}` }, () => loadDashboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, credits')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
      }

      // Load subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, auto_renew')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const now = new Date();
      let creditData: CreditInfo = {
        credits: profile?.credits || 0,
        plan: 'FREE',
        daysRemaining: 0,
        endDate: null,
        hasActiveSubscription: false,
        isExpiringSoon: false,
        isExpired: false,
      };

      if (subscription) {
        const endDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        creditData = {
          credits: profile?.credits || 0,
          plan: (subscription.plan || 'free').toUpperCase(),
          daysRemaining,
          endDate,
          hasActiveSubscription: true,
          isExpiringSoon: daysRemaining > 0 && daysRemaining < 7,
          isExpired: daysRemaining <= 0,
        };
      }
      setCreditInfo(creditData);

      // Load missions stats
      const { data: missions } = await supabase
        .from('missions')
        .select('status')
        .or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);

      const totalMissions = missions?.length || 0;
      const activeMissions = missions?.filter(m => m.status === 'in_progress').length || 0;
      const completedMissions = missions?.filter(m => m.status === 'completed').length || 0;
      const completionRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;

      // Load contacts
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setStats({
        activeMissions,
        completedMissions,
        totalMissions,
        totalContacts: contactsCount || 0,
        completionRate,
      });

      // Load recent activities
      const { data: recentMissions } = await supabase
        .from('missions')
        .select('id, status, pickup_address, delivery_address, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = (recentMissions || []).map(m => ({
        id: m.id,
        icon: m.status === 'completed' ? 'check' : m.status === 'in_progress' ? 'truck' : 'clock',
        title: m.status === 'completed' ? 'Mission complétée' : m.status === 'in_progress' ? 'Mission en cours' : 'Mission en attente',
        subtitle: `${m.pickup_address?.split(',')[0] || 'Départ'} → ${m.delivery_address?.split(',')[0] || 'Arrivée'}`,
        time: getTimeAgo(m.created_at),
        color: m.status === 'completed' ? 'green' : m.status === 'in_progress' ? 'amber' : 'blue',
      }));
      setRecentActivities(activities);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return days === 1 ? 'Hier' : `Il y a ${days}j`;
    if (hours > 0) return `Il y a ${hours}h`;
    return 'À l\'instant';
  };

  const pendingMissions = stats.totalMissions - stats.completedMissions - stats.activeMissions;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-50/50">
      {/* Header - Exactly like Flutter */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">{getGreeting()}</p>
              <h1 className="text-lg font-bold text-slate-800">
                {firstName ? `${firstName} ${lastName}` : user?.email}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleRefresh}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className={`w-5 h-5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              <motion.button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <User className="w-5 h-5 text-blue-600" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* Credits Card - Exactly like Flutter */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
        >
          <div 
            className={`relative overflow-hidden rounded-2xl p-6 ${
              creditInfo.isExpired 
                ? 'bg-gradient-to-br from-red-500/90 to-red-600' 
                : creditInfo.isExpiringSoon 
                  ? 'bg-gradient-to-br from-amber-500/90 to-amber-600'
                  : 'bg-gradient-to-br from-teal-500 to-blue-600'
            }`}
            style={{
              boxShadow: creditInfo.isExpired 
                ? '0 10px 24px rgba(239, 68, 68, 0.4), 0 4px 8px rgba(0,0,0,0.08)'
                : creditInfo.isExpiringSoon
                  ? '0 10px 24px rgba(245, 158, 11, 0.4), 0 4px 8px rgba(0,0,0,0.08)'
                  : '0 10px 24px rgba(20, 184, 166, 0.4), 0 4px 8px rgba(0,0,0,0.08)'
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/80 text-sm font-semibold tracking-wide drop-shadow-sm">
                  Crédits disponibles
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-5xl font-bold text-white drop-shadow-md">
                    {creditInfo.credits}
                  </span>
                  <Wallet className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
              </div>
              
              <div 
                className="px-4 py-2 bg-white/30 rounded-full shadow-md"
              >
                <span className="text-white font-bold tracking-wider drop-shadow-sm">
                  {creditInfo.plan}
                </span>
              </div>
            </div>

            {creditInfo.hasActiveSubscription && (
              <>
                <div className="h-px bg-white/30 my-5" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {creditInfo.isExpired ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : creditInfo.isExpiringSoon ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : (
                      <Calendar className="w-5 h-5 text-white" />
                    )}
                    <div>
                      <p className="text-white font-semibold drop-shadow-sm">
                        {creditInfo.isExpired 
                          ? 'Abonnement expiré' 
                          : creditInfo.isExpiringSoon 
                            ? 'Expire bientôt' 
                            : 'Abonnement actif'}
                      </p>
                      <p className="text-white font-bold drop-shadow-md">
                        {creditInfo.isExpired 
                          ? 'Renouvelez dès maintenant' 
                          : `${creditInfo.daysRemaining} jours restants`}
                      </p>
                      {creditInfo.endDate && (
                        <p className="text-white/80 text-xs mt-1">
                          Expire le {creditInfo.endDate.toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Link to="/shop">
                    <motion.button
                      className={`px-4 py-2 rounded-xl font-semibold ${
                        creditInfo.isExpired 
                          ? 'bg-white text-red-600' 
                          : 'bg-white text-teal-600'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {creditInfo.isExpired ? 'Renouveler' : 'Gérer'}
                    </motion.button>
                  </Link>
                </div>
              </>
            )}

            {!creditInfo.hasActiveSubscription && (
              <>
                <div className="h-px bg-white/30 my-5" />
                <div className="flex items-center justify-between">
                  <p className="text-white/80 text-sm">Passez à Pro pour plus de crédits</p>
                  <Link to="/shop">
                    <motion.button
                      className="px-4 py-2 bg-white text-teal-600 rounded-xl font-semibold"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Passer à Pro
                    </motion.button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Quick Stats - 2x2 Grid like Flutter */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Truck, label: 'Missions actives', value: stats.activeMissions, color: '#14b8a6' },
            { icon: CheckCircle, label: 'Complétées', value: stats.completedMissions, color: '#22c55e' },
            { icon: Users, label: 'Contacts CRM', value: stats.totalContacts, color: '#3b82f6' },
            { icon: TrendingUp, label: 'Taux succès', value: `${stats.completionRate.toFixed(0)}%`, color: '#8b5cf6' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i + 1}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="bg-white rounded-2xl p-5 text-center"
              style={{
                boxShadow: `0 6px 12px ${stat.color}20, 0 2px 4px rgba(0,0,0,0.05)`
              }}
            >
              <div 
                className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3"
                style={{ 
                  backgroundColor: `${stat.color}15`,
                  boxShadow: `0 4px 8px ${stat.color}30`
                }}
              >
                <stat.icon className="w-7 h-7" style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold text-slate-800 drop-shadow-sm">{stat.value}</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Progress Chart - Like Flutter */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="bg-white rounded-2xl p-6"
          style={{
            boxShadow: '0 6px 12px rgba(59, 130, 246, 0.1), 0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          <h3 className="text-lg font-bold text-slate-800 drop-shadow-sm mb-5">
            Progression des missions
          </h3>
          
          {/* Progress Bar */}
          <div className="h-3 rounded-lg overflow-hidden flex shadow-inner" style={{ backgroundColor: '#e2e8f0' }}>
            {stats.completedMissions > 0 && (
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.completedMissions / Math.max(stats.totalMissions, 1)) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            )}
            {stats.activeMissions > 0 && (
              <motion.div
                className="h-full bg-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.activeMissions / Math.max(stats.totalMissions, 1)) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex justify-between mt-4">
            {[
              { label: 'Complétées', color: '#22c55e', value: stats.completedMissions },
              { label: 'En cours', color: '#f59e0b', value: stats.activeMissions },
              { label: 'Pending', color: '#cbd5e1', value: pendingMissions },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ 
                    backgroundColor: item.color,
                    boxShadow: `0 2px 4px ${item.color}40`
                  }}
                />
                <span className="text-xs text-slate-500 font-semibold">
                  {item.label} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions - Like Flutter */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              custom={6}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <Link to="/missions/new">
                <div 
                  className="rounded-2xl p-5 text-center bg-gradient-to-br from-teal-500 to-blue-600"
                  style={{
                    boxShadow: '0 8px 16px rgba(20, 184, 166, 0.4), 0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="w-12 h-12 mx-auto bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white font-bold text-sm drop-shadow-md">Nouvelle mission</p>
                </div>
              </Link>
            </motion.div>

            <motion.div
              custom={7}
              initial="hidden"
              animate="visible"
              variants={fadeIn}
            >
              <Link to="/contacts/new">
                <div 
                  className="rounded-2xl p-5 text-center bg-gradient-to-br from-indigo-500 to-purple-600"
                  style={{
                    boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4), 0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="w-12 h-12 mx-auto bg-white/20 rounded-xl flex items-center justify-center mb-3">
                    <UserPlus className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white font-bold text-sm drop-shadow-md">Nouveau contact</p>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Recent Activity - Like Flutter */}
        <motion.div
          custom={8}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="bg-white rounded-2xl p-6"
          style={{
            boxShadow: '0 6px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.03)'
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Activité récente</h3>
            <Link to="/missions" className="text-sm text-teal-600 font-semibold hover:underline flex items-center gap-1">
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Truck className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity, i) => {
                const colors: Record<string, string> = {
                  green: '#22c55e',
                  amber: '#f59e0b',
                  blue: '#3b82f6',
                  purple: '#8b5cf6',
                };
                const color = colors[activity.color] || colors.blue;
                const icons: Record<string, any> = {
                  check: CheckCircle,
                  truck: Truck,
                  clock: Calendar,
                  camera: Camera,
                };
                const Icon = icons[activity.icon] || Truck;

                return (
                  <div key={activity.id || i} className="flex items-center gap-4">
                    <div 
                      className="p-2.5 rounded-xl"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                      <p className="text-xs text-slate-500 truncate">{activity.subtitle}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
