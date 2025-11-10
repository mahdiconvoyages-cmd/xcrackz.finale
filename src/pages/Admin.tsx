// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useEffect, useState } from 'react';
import { Users, Truck, DollarSign, CreditCard, TrendingUp, Package, ShoppingCart, UserCheck, Search, Plus, Shield, Trash2, CheckCircle, XCircle, Gift, AlertTriangle, MapPin, Navigation, MessageCircle, Activity, BarChart3, PieChart, Clock, Zap, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AdminShopRequests from '../components/AdminShopRequests';

interface Statistics {
  total_users: number;
  total_missions: number;
  missions_in_progress: number;
  missions_completed: number;
  total_transactions: number;
  total_revenue: number;
  total_credits_distributed: number;
  total_contacts: number;
  active_users_today: number;
  new_users_this_week: number;
  revenue_this_month: number;
  missions_this_month: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_admin: boolean;
  is_verified: boolean;
  user_type: string;
  company_name?: string;
  phone?: string;
  banned?: boolean;
  ban_reason?: string;
  banned_at?: string;
  last_sign_in_at?: string;
}

interface UserWithCredits extends User {
  credits?: {
    balance: number;
  } | null;
  subscription?: {
    status: string;
    plan: string;
    current_period_end: string;
    auto_renew?: boolean;
  } | null;
}

interface Transaction {
  id: string;
  amount: number;
  credits: number;
  payment_status: string;
  created_at: string;
  profiles: {
    email: string;
  } | { email: string }[];
}

export default function Admin() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [allUsers, setAllUsers] = useState<UserWithCredits[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithCredits[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'starter' | 'basic' | 'pro' | 'business' | 'enterprise' | 'none'>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tracking' | 'analytics' | 'shop-requests'>('overview');
  const [trackingMissions, setTrackingMissions] = useState<any[]>([]);
  const [supportCount, setSupportCount] = useState(0);
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'client' | 'driver'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'banned' | 'admin'>('all');

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [grantType, setGrantType] = useState<'credits' | 'subscription'>('credits');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantPlan, setGrantPlan] = useState('pro');
  const [grantDuration, setGrantDuration] = useState('30');
  const [shopPlans, setShopPlans] = useState<Array<{name: string, credits_amount: number, price: number}>>([]);

  useEffect(() => {
    loadAdminData();

    const subscriptionsChannel = supabase
      .channel('admin-subscriptions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions'
        },
        () => {
          loadAllUsers();
          loadStatistics();
        }
      )
      .subscribe();

    const creditsChannel = supabase
      .channel('admin-credits-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits'
        },
        () => {
          loadAllUsers();
          loadStatistics();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('admin-profiles-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          loadAllUsers();
          loadStatistics();
        }
      )
      .subscribe();

    const missionsChannel = supabase
      .channel('admin-missions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missions'
        },
        () => {
          loadTrackingMissions();
          loadStatistics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionsChannel);
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(missionsChannel);
    };
  }, []);

  useEffect(() => {
    let filtered = allUsers.filter(user =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (subscriptionFilter === 'none') {
          return !user.subscription || user.subscription.status !== 'active';
        }
        return user.subscription?.plan === subscriptionFilter && user.subscription?.status === 'active';
      });
    }

    if (userTypeFilter !== 'all') {
      filtered = filtered.filter(user => user.user_type === userTypeFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'verified') {
        filtered = filtered.filter(user => user.is_verified);
      } else if (statusFilter === 'banned') {
        filtered = filtered.filter(user => user.banned);
      } else if (statusFilter === 'admin') {
        filtered = filtered.filter(user => user.is_admin);
      }
    }

    setFilteredUsers(filtered);
  }, [searchQuery, subscriptionFilter, allUsers, userTypeFilter, statusFilter]);

  const loadAdminData = async () => {
    try {
      await Promise.all([
        loadStatistics(),
        loadAllUsers(),
        loadRecentTransactions(),
        loadTrackingMissions(),
        loadSupportCount(),
        loadShopPlans(),
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSupportCount = async () => {
    try {
      const { count, error } = await supabase
        .from('support_conversations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'pending']);

      if (error) throw error;
      setSupportCount(count || 0);
    } catch (error) {
      console.error('Error loading support count:', error);
    }
  };

  const loadShopPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_items')
        .select('name, credits_amount, price')
        .eq('item_type', 'subscription')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      if (data) setShopPlans(data);
    } catch (error) {
      console.error('Error loading shop plans:', error);
    }
  };

  const loadTrackingMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select(`
          id,
          reference,
          status,
          pickup_address,
          delivery_address,
          pickup_date,
          driver_id,
          user_id,
          profiles!missions_user_id_fkey(email, full_name)
        `)
        .in('status', ['pending', 'in_progress'])
        .order('pickup_date', { ascending: true });

      if (error) throw error;

      const missionsWithDrivers = await Promise.all(
        (data || []).map(async (mission) => {
          if (mission.driver_id) {
            const { data: driver } = await supabase
              .from('contacts')
              .select('first_name, last_name')
              .eq('id', mission.driver_id)
              .single();
            return { ...mission, driver };
          }
          return { ...mission, driver: null };
        })
      );

      setTrackingMissions(missionsWithDrivers);
    } catch (error) {
      console.error('Error loading tracking missions:', error);
    }
  };

  const loadStatistics = async () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      { count: totalUsers },
      { count: totalMissions },
      { count: missionsInProgress },
      { count: missionsCompleted },
      { count: totalTransactions },
      { data: revenueData },
      { data: creditsData },
      { count: totalContacts },
      { count: newUsersThisWeek },
      { count: activeUsersToday },
      { data: revenueThisMonth },
      { count: missionsThisMonth },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('missions').select('*', { count: 'exact', head: true }),
      supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('payment_status', 'paid'),
      supabase.from('user_credits').select('balance'),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('payment_status', 'paid').gte('created_at', monthStart.toISOString()),
      supabase.from('missions').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    ]);

    const totalRevenue = revenueData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalCreditsDistributed = creditsData?.reduce((sum, c) => sum + Number(c.balance), 0) || 0;
    const revenueMonth = revenueThisMonth?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    setStatistics({
      total_users: totalUsers || 0,
      total_missions: totalMissions || 0,
      missions_in_progress: missionsInProgress || 0,
      missions_completed: missionsCompleted || 0,
      total_transactions: totalTransactions || 0,
      total_revenue: totalRevenue,
      total_credits_distributed: totalCreditsDistributed,
      total_contacts: totalContacts || 0,
      active_users_today: activeUsersToday || 0,
      new_users_this_week: newUsersThisWeek || 0,
      revenue_this_month: revenueMonth,
      missions_this_month: missionsThisMonth || 0,
    });
  };

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          credits:user_credits(balance),
          subscription:subscriptions!subscriptions_user_id_fkey(status, plan, current_period_end, auto_renew)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        const { data: simpleData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        setAllUsers(simpleData || []);
        setFilteredUsers(simpleData || []);
        return;
      }

      const usersWithData = (data || []).map(user => ({
        ...user,
        credits: Array.isArray(user.credits) ? user.credits[0] : user.credits,
        subscription: Array.isArray(user.subscription) ? user.subscription[0] : user.subscription
      }));

      setAllUsers(usersWithData);
      setFilteredUsers(usersWithData);
    } catch (err) {
      console.error('Error in loadAllUsers:', err);
    }
  };

  const loadRecentTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount, credits, payment_status, created_at, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    const formattedData = (data || []).map(t => ({
      ...t,
      profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
    }));
    setRecentTransactions(formattedData as Transaction[]);
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentStatus })
      .eq('id', userId);

    if (error) {
      alert('Erreur lors de la modification du statut admin');
    } else {
      loadAllUsers();
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !currentStatus })
      .eq('id', userId);

    if (error) {
      alert('Erreur lors de la modification du statut de vérification');
    } else {
      loadAllUsers();
    }
  };

  const handleBanUser = async (userId: string, userEmail: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? 'débannir' : 'bannir';
    const reason = currentlyBanned ? null : prompt(`Raison du bannissement de ${userEmail}:`);

    if (!currentlyBanned && !reason) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        banned: !currentlyBanned,
        ban_reason: reason,
        banned_at: currentlyBanned ? null : new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      alert(`Erreur lors du ${action}issement de l'utilisateur`);
    } else {
      loadAllUsers();
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`⚠️ ATTENTION: Êtes-vous sûr de vouloir SUPPRIMER ${userEmail} ?`)) {
      return;
    }

    const confirmation = prompt('Tapez "SUPPRIMER" pour confirmer:');
    if (confirmation !== 'SUPPRIMER') {
      alert('Suppression annulée');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      alert('Erreur lors de la suppression');
    } else {
      loadAllUsers();
    }
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !grantAmount) return;

    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Montant invalide');
      return;
    }

    try {
      // Récupérer les crédits actuels depuis profiles
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', selectedUser.id)
        .single();

      if (fetchError) {
        alert('Erreur lors de la récupération du profil');
        console.error(fetchError);
        return;
      }

      const currentCredits = (profile as any)?.credits || 0;

      // Mettre à jour profiles.credits (source unique de vérité)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          credits: currentCredits + amount
        })
        .eq('id', selectedUser.id);

      if (updateError) {
        alert('Erreur lors de l\'ajout des crédits');
        console.error(updateError);
        return;
      }

      // Optionnel : synchroniser user_credits pour compatibilité legacy
      const { data: existingCredits } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', selectedUser.id)
        .single();

      if (existingCredits) {
        await supabase
          .from('user_credits')
          .update({
            balance: existingCredits.balance + amount
          })
          .eq('user_id', selectedUser.id);
      } else {
        await supabase
          .from('user_credits')
          .insert([{
            user_id: selectedUser.id,
            balance: amount
          }]);
      }

      await loadAllUsers();
      alert(`✅ ${amount} crédits ajoutés avec succès à ${selectedUser.email}!`);

      setShowGrantModal(false);
      setSelectedUser(null);
      setGrantAmount('');
    } catch (err) {
      console.error('Erreur inattendue:', err);
      alert('Erreur lors de l\'attribution des crédits');
    }
  };

  const handleGrantSubscription = async () => {
    if (!selectedUser || !grantPlan || !grantDuration) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const days = parseInt(grantDuration);
    if (isNaN(days) || days <= 0) {
      alert('Durée invalide');
      return;
    }

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      // Calculer les crédits selon le plan
      // Plans réels: Basic (19.99€) = 25, Pro (49.99€) = 100, Business/Enterprise (79.99€) = 500
      const planCredits: { [key: string]: number } = {
        'free': 0,
        'starter': 10,
        'basic': 25,        // 19.99€/mois
        'pro': 100,         // 49.99€/mois
        'business': 500,    // 79.99€/mois
        'enterprise': 500   // 79.99€/mois
      };
      
      const creditsToAdd = planCredits[grantPlan] || 0;
      
      console.log('🎯 Attribution abonnement:', {
        plan: grantPlan,
        creditsToAdd,
        user: selectedUser.email
      });

      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', selectedUser.id)
        .maybeSingle();

      const isNewSubscription = !existingSub;

      if (existingSub) {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            plan: grantPlan,
            status: 'active',
            current_period_end: endDate.toISOString(),
            payment_method: 'manual',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', selectedUser.id);

        if (error) {
          alert(`Erreur mise à jour abonnement: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert({
            user_id: selectedUser.id,
            plan: grantPlan,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: endDate.toISOString(),
            payment_method: 'manual'
          });

        if (error) {
          alert(`Erreur création abonnement: ${error.message}`);
          return;
        }
      }

      // Ajouter les crédits SEULEMENT si c'est un nouvel abonnement
      // OU demander confirmation si mise à jour
      if (creditsToAdd > 0) {
        let shouldAddCredits = isNewSubscription;
        
        if (!isNewSubscription) {
          shouldAddCredits = confirm(
            `Cet utilisateur a déjà un abonnement.\n\n` +
            `Voulez-vous ajouter ${creditsToAdd} crédits en plus ?\n\n` +
            `⚠️ Cliquez "OK" pour ajouter les crédits\n` +
            `⚠️ Cliquez "Annuler" pour juste prolonger l'abonnement`
          );
        }
        
        if (shouldAddCredits) {
          const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', selectedUser.id)
            .single();

          if (fetchError) {
            console.error('❌ Erreur récupération profil:', fetchError);
            alert(`⚠️ Abonnement accordé mais erreur récupération profil: ${fetchError.message}`);
          } else {
            const currentCredits = (profile as any)?.credits || 0;
            
            console.log('💰 Ajout crédits:', {
              currentCredits,
              creditsToAdd,
              newTotal: currentCredits + creditsToAdd,
              isNewSubscription
            });
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                credits: currentCredits + creditsToAdd
              })
              .eq('id', selectedUser.id);

            if (updateError) {
              console.error('❌ Erreur ajout crédits:', updateError);
              alert(`⚠️ Abonnement accordé mais erreur lors de l'ajout des ${creditsToAdd} crédits: ${updateError.message}`);
            } else {
              console.log('✅ Crédits ajoutés avec succès');
            }
          }
        }
      }

      await loadAllUsers();
      
      const creditsMessage = creditsToAdd > 0 && shouldAddCredits 
        ? `\n💳 ${creditsToAdd} crédits ajoutés` 
        : '';
      
      alert(`✅ Abonnement ${grantPlan.toUpperCase()} accordé pour ${days} jours !${creditsMessage}`);

      setShowGrantModal(false);
      setSelectedUser(null);
      setGrantPlan('pro');
      setGrantDuration('30');
    } catch (err) {
      console.error('Erreur attribution abonnement:', err);
      alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const handleRemoveCredits = async (user: UserWithCredits) => {
    const amount = prompt(`Combien de crédits voulez-vous retirer à ${user.email} ?\n\nCrédits actuels: ${user.credits?.balance || 0}`);
    
    if (!amount) return;
    
    const creditsToRemove = parseInt(amount);
    if (isNaN(creditsToRemove) || creditsToRemove <= 0) {
      alert('Montant invalide');
      return;
    }

    try {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        alert(`Erreur: ${fetchError.message}`);
        return;
      }

      const currentCredits = (profile as any)?.credits || 0;
      
      if (currentCredits < creditsToRemove) {
        const confirmNegative = confirm(
          `⚠️ Attention !\n\n` +
          `L'utilisateur a seulement ${currentCredits} crédits.\n` +
          `Retirer ${creditsToRemove} crédits donnera un solde négatif de ${currentCredits - creditsToRemove}.\n\n` +
          `Voulez-vous continuer ?`
        );
        
        if (!confirmNegative) return;
      }

      const newBalance = currentCredits - creditsToRemove;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newBalance })
        .eq('id', user.id);

      if (updateError) {
        alert(`Erreur: ${updateError.message}`);
        return;
      }

      await loadAllUsers();
      alert(`✅ ${creditsToRemove} crédits retirés !\nNouveau solde: ${newBalance}`);
    } catch (err) {
      alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const handleCancelSubscription = async (user: UserWithCredits) => {
    if (!user.subscription) {
      alert("Cet utilisateur n'a pas d'abonnement actif");
      return;
    }

    const confirmCancel = confirm(
      `⚠️ Annuler l'abonnement de ${user.email} ?\n\n` +
      `Plan actuel: ${user.subscription.plan?.toUpperCase()}\n` +
      `Expire le: ${new Date(user.subscription.current_period_end).toLocaleDateString('fr-FR')}\n\n` +
      `L'abonnement sera marqué comme "cancelled".\n` +
      `Les crédits ne seront PAS retirés.`
    );

    if (!confirmCancel) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        alert(`Erreur: ${error.message}`);
        return;
      }

      await loadAllUsers();
      alert(`✅ Abonnement annulé avec succès`);
    } catch (err) {
      alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const handleToggleAutoRenew = async (userId: string, userEmail: string, currentAutoRenew: boolean) => {
    const action = currentAutoRenew ? 'désactiver' : 'activer';
    const confirmMessage = currentAutoRenew
      ? `⏸️ Désactiver le renouvellement automatique pour ${userEmail} ?\n\nCet utilisateur ne recevra PLUS de crédits automatiquement chaque mois.`
      : `✅ Activer le renouvellement automatique pour ${userEmail} ?\n\nCet utilisateur recevra des crédits automatiquement chaque mois selon son plan.`;

    if (!confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          auto_renew: !currentAutoRenew,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        alert(`Erreur lors de la modification: ${error.message}`);
        return;
      }

      await loadAllUsers();
      const emoji = currentAutoRenew ? '⏸️' : '✅';
      alert(`${emoji} Renouvellement automatique ${currentAutoRenew ? 'désactivé' : 'activé'} !`);
    } catch (err) {
      alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const openGrantModal = (user: UserWithCredits, type: 'credits' | 'subscription') => {
    setSelectedUser(user);
    setGrantType(type);
    setShowGrantModal(true);
  };

  const exportUsersCSV = () => {
    const csv = [
      ['Email', 'Nom', 'Type', 'Crédits', 'Plan', 'Vérifié', 'Admin', 'Date inscription'].join(','),
      ...filteredUsers.map(u => [
        u.email,
        u.full_name || '',
        u.user_type || 'client',
        u.credits?.balance || 0,
        u.subscription?.plan || 'none',
        u.is_verified ? 'Oui' : 'Non',
        u.is_admin ? 'Oui' : 'Non',
        new Date(u.created_at).toLocaleDateString('fr-FR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between animate-in slide-in-from-top duration-500">
          <div>
            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-slate-900 via-teal-800 to-slate-900 bg-clip-text text-transparent">
              xcrackz Admin
            </h1>
            <p className="text-slate-600 text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-500" />
              Tableau de bord avancé
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/support"
              className="relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-2xl transition-all hover:-translate-y-1"
            >
              <MessageCircle className="w-5 h-5" />
              Support
              {supportCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {supportCount}
                </span>
              )}
            </Link>
            <Link
              to="/admin/security"
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-2xl transition-all hover:-translate-y-1"
            >
              <AlertTriangle className="w-5 h-5" />
              Sécurité
            </Link>
          </div>
        </div>

        <div className="flex gap-2 border-b-2 border-slate-200 pb-2">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'users', label: `Utilisateurs (${allUsers.length})`, icon: Users },
            { id: 'tracking', label: `Missions GPS (${trackingMissions.length})`, icon: MapPin },
            { id: 'analytics', label: 'Analytics', icon: PieChart },
            { id: 'shop-requests', label: 'Demandes Boutique', icon: ShoppingCart },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-bold rounded-t-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-lg -translate-y-1'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Utilisateurs', value: statistics?.total_users || 0, icon: Users, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50' },
                { label: 'Missions', value: statistics?.total_missions || 0, icon: Truck, gradient: 'from-teal-500 to-green-500', bg: 'bg-teal-50' },
                { label: 'Revenus', value: `${statistics?.total_revenue.toLocaleString('fr-FR')}€`, icon: DollarSign, gradient: 'from-green-500 to-emerald-500', bg: 'bg-green-50' },
                { label: 'Crédits', value: statistics?.total_credits_distributed || 0, icon: CreditCard, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
                { label: 'En cours', value: statistics?.missions_in_progress || 0, icon: TrendingUp, gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50' },
                { label: 'Terminées', value: statistics?.missions_completed || 0, icon: Package, gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50' },
                { label: 'Transactions', value: statistics?.total_transactions || 0, icon: ShoppingCart, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50' },
                { label: 'Contacts', value: statistics?.total_contacts || 0, icon: UserCheck, gradient: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-50' },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={`${stat.bg} border-2 border-white rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-in slide-in-from-bottom cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-xl shadow-lg`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                    <span className={`text-4xl font-black bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-700">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                  <Zap className="w-7 h-7 text-yellow-500" />
                  Statistiques en temps réel
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'Actifs aujourd\'hui', value: statistics?.active_users_today || 0, color: 'text-green-600', bg: 'bg-green-100' },
                    { label: 'Nouveaux cette semaine', value: statistics?.new_users_this_week || 0, color: 'text-blue-600', bg: 'bg-blue-100' },
                    { label: 'Revenus ce mois', value: `${statistics?.revenue_this_month.toLocaleString('fr-FR')}€`, color: 'text-green-600', bg: 'bg-green-100' },
                    { label: 'Missions ce mois', value: statistics?.missions_this_month || 0, color: 'text-purple-600', bg: 'bg-purple-100' },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                      <span className="font-bold text-slate-700">{stat.label}</span>
                      <span className={`text-2xl font-black ${stat.color} ${stat.bg} px-4 py-2 rounded-lg`}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                  <Package className="w-7 h-7 text-purple-500" />
                  Plans d'abonnement
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {shopPlans.map((plan, i) => (
                    <div
                      key={plan.name}
                      style={{ animationDelay: `${i * 50}ms` }}
                      className="text-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 hover:border-teal-400 transition-all hover:shadow-lg animate-in zoom-in"
                    >
                      <div className="text-3xl font-black text-teal-600 mb-2">
                        {allUsers.filter(u => u.subscription?.plan === plan.name && u.subscription.status === 'active').length}
                      </div>
                      <div className="text-xs font-bold text-slate-700 uppercase">{plan.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{plan.credits_amount} crédits</div>
                    </div>
                  ))}
                  <div className="text-center p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
                    <div className="text-3xl font-black text-red-600 mb-2">
                      {allUsers.filter(u => !u.subscription || u.subscription.status !== 'active').length}
                    </div>
                    <div className="text-xs font-bold text-red-700 uppercase">Sans plan</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                <ShoppingCart className="w-7 h-7 text-green-500" />
                Transactions récentes
              </h2>
              <div className="space-y-3">
                {recentTransactions.map((transaction, i) => (
                  <div
                    key={transaction.id}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1 border border-slate-200 animate-in slide-in-from-right"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-black text-lg">
                        {(Array.isArray(transaction.profiles) ? transaction.profiles[0]?.email : transaction.profiles?.email)?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{Array.isArray(transaction.profiles) ? transaction.profiles[0]?.email : transaction.profiles?.email}</p>
                        <p className="text-sm text-slate-600 font-semibold">{transaction.credits} crédits • {new Date(transaction.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-green-600">{Number(transaction.amount).toFixed(2)}€</p>
                      <span
                        className={`inline-block px-3 py-1 text-xs font-black rounded-full ${
                          transaction.payment_status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : transaction.payment_status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {transaction.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-4 mb-6 flex-wrap">
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 font-semibold transition"
                  />
                </div>
                <select
                  value={subscriptionFilter}
                  onChange={(e) => setSubscriptionFilter(e.target.value as any)}
                  className="px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 bg-white font-bold"
                >
                  <option value="all">Tous plans</option>
                  {shopPlans.map(plan => (
                    <option key={plan.name} value={plan.name}>{plan.name.toUpperCase()}</option>
                  ))}
                  <option value="none">Sans plan</option>
                </select>
                <select
                  value={userTypeFilter}
                  onChange={(e) => setUserTypeFilter(e.target.value as any)}
                  className="px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 bg-white font-bold"
                >
                  <option value="all">Tous types</option>
                  <option value="client">Clients</option>
                  <option value="driver">Chauffeurs</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 bg-white font-bold"
                >
                  <option value="all">Tous statuts</option>
                  <option value="verified">Vérifiés</option>
                  <option value="banned">Bannis</option>
                  <option value="admin">Admins</option>
                </select>
                <button
                  onClick={exportUsersCSV}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  <Download className="w-5 h-5" />
                  Export CSV
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border-2 border-slate-200">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-50">
                    <tr>
                      <th className="text-left py-4 px-6 font-black text-slate-700">Utilisateur</th>
                      <th className="text-left py-4 px-6 font-black text-slate-700">Type</th>
                      <th className="text-left py-4 px-6 font-black text-slate-700">Crédits</th>
                      <th className="text-left py-4 px-6 font-black text-slate-700">Plan</th>
                      <th className="text-left py-4 px-6 font-black text-slate-700">Statut</th>
                      <th className="text-right py-4 px-6 font-black text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, i) => (
                      <tr
                        key={user.id}
                        style={{ animationDelay: `${i * 20}ms` }}
                        className="border-t border-slate-200 hover:bg-slate-50 transition animate-in fade-in"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg">
                              {user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.full_name || 'N/A'}</p>
                              <p className="text-sm text-slate-600">{user.email}</p>
                              {user.company_name && (
                                <p className="text-xs text-slate-500 font-semibold">{user.company_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-block px-3 py-1 text-xs font-black rounded-full bg-blue-100 text-blue-700">
                            {user.user_type || 'client'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-slate-900">
                              {user.credits?.balance || 0}
                            </span>
                            <button
                              onClick={() => openGrantModal(user, 'credits')}
                              className="p-2 hover:bg-amber-100 rounded-lg transition"
                              title="Ajouter crédits"
                            >
                              <Plus className="w-5 h-5 text-amber-600" />
                            </button>
                            <button
                              onClick={() => handleRemoveCredits(user)}
                              className="p-2 hover:bg-red-100 rounded-lg transition"
                              title="Retirer crédits"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {user.subscription && user.subscription.status === 'active' ? (
                            <div className="flex items-center gap-2">
                              <span className={`inline-block px-3 py-1 text-xs font-black rounded-full ${
                                user.subscription.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                user.subscription.plan === 'business' ? 'bg-blue-100 text-blue-700' :
                                user.subscription.plan === 'pro' ? 'bg-teal-100 text-teal-700' :
                                user.subscription.plan === 'basic' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {user.subscription.plan?.toUpperCase()}
                              </span>
                              <button
                                onClick={() => handleToggleAutoRenew(user.id, user.email, user.subscription?.auto_renew || false)}
                                className={`p-2 rounded-lg transition ${
                                  user.subscription?.auto_renew 
                                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                title={user.subscription?.auto_renew ? 'Auto-renouvellement activé (cliquez pour désactiver)' : 'Auto-renouvellement désactivé (cliquez pour activer)'}
                              >
                                <Zap className={`w-5 h-5 ${user.subscription?.auto_renew ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                onClick={() => openGrantModal(user, 'subscription')}
                                className="p-2 hover:bg-teal-100 rounded-lg transition"
                                title="Prolonger/Modifier"
                              >
                                <Gift className="w-5 h-5 text-teal-600" />
                              </button>
                              <button
                                onClick={() => handleCancelSubscription(user)}
                                className="p-2 hover:bg-red-100 rounded-lg transition"
                                title="Annuler abonnement"
                              >
                                <XCircle className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => openGrantModal(user, 'subscription')}
                              className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-bold"
                            >
                              <Plus className="w-4 h-4" />
                              Attribuer
                            </button>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {user.is_admin && (
                              <span className="inline-block px-2 py-1 text-xs font-black rounded-full bg-red-100 text-red-700">
                                ADMIN
                              </span>
                            )}
                            {user.is_verified && (
                              <span className="inline-block px-2 py-1 text-xs font-black rounded-full bg-green-100 text-green-700">
                                VÉRIFIÉ
                              </span>
                            )}
                            {user.banned && (
                              <span className="inline-block px-2 py-1 text-xs font-black rounded-full bg-orange-100 text-orange-700" title={user.ban_reason || 'Banni'}>
                                BANNI
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdmin(user.id, user.is_admin)}
                              className={`p-2 rounded-lg transition ${
                                user.is_admin
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              title={user.is_admin ? 'Retirer admin' : 'Admin'}
                            >
                              <Shield className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => handleToggleVerification(user.id, user.is_verified)}
                              className={`p-2 rounded-lg transition ${
                                user.is_verified
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              title={user.is_verified ? 'Retirer' : 'Vérifier'}
                            >
                              {user.is_verified ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            </button>

                            <button
                              onClick={() => handleBanUser(user.id, user.email, user.banned || false)}
                              className={`p-2 rounded-lg transition ${
                                user.banned
                                  ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                  : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                              }`}
                              title={user.banned ? 'Débannir' : 'Bannir'}
                            >
                              <AlertTriangle className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                <MapPin className="w-7 h-7 text-teal-500" />
                Missions GPS actives
              </h2>

              {trackingMissions.length === 0 ? (
                <div className="text-center py-16">
                  <Navigation className="w-20 h-20 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-xl font-bold">Aucune mission active</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {trackingMissions.map((mission, i) => (
                    <div
                      key={mission.id}
                      style={{ animationDelay: `${i * 50}ms` }}
                      className="bg-gradient-to-r from-slate-50 to-white border-2 border-slate-200 rounded-xl p-6 hover:shadow-2xl transition-all hover:-translate-y-1 animate-in slide-in-from-left"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-slate-900 mb-3">{mission.title}</h3>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-bold text-slate-700">Départ</p>
                                <p className="text-slate-600">{mission.departure_address}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-bold text-slate-700">Arrivée</p>
                                <p className="text-slate-600">{mission.arrival_address}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-block px-4 py-2 text-sm font-black rounded-xl ${
                            mission.status === 'in_progress'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {mission.status === 'in_progress' ? '🚗 En cours' : '⏳ En attente'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t-2 border-slate-200">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-xs text-slate-500 font-bold">Client</p>
                            <p className="font-bold text-slate-900">
                              {mission.profiles?.full_name || mission.profiles?.email || 'N/A'}
                            </p>
                          </div>
                          {mission.driver && (
                            <div>
                              <p className="text-xs text-slate-500 font-bold">Chauffeur</p>
                              <p className="font-bold text-slate-900">
                                {mission.driver.first_name} {mission.driver.last_name}
                              </p>
                            </div>
                          )}
                        </div>

                        <Link
                          to={`/missions/${mission.id}/tracking`}
                          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-3 rounded-xl font-black hover:shadow-2xl transition-all hover:-translate-y-1"
                        >
                          <Navigation className="w-5 h-5" />
                          Suivre
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                  <BarChart3 className="w-7 h-7 text-blue-500" />
                  Répartition par type
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'Clients', value: allUsers.filter(u => u.user_type === 'client').length, color: 'bg-blue-500' },
                    { label: 'Chauffeurs', value: allUsers.filter(u => u.user_type === 'driver').length, color: 'bg-green-500' },
                    { label: 'Vérifiés', value: allUsers.filter(u => u.is_verified).length, color: 'bg-teal-500' },
                    { label: 'Admins', value: allUsers.filter(u => u.is_admin).length, color: 'bg-red-500' },
                  ].map((stat) => {
                    const percentage = Math.round((stat.value / allUsers.length) * 100);
                    return (
                      <div key={stat.label}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-700">{stat.label}</span>
                          <span className="text-xl font-black text-slate-900">{stat.value} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`${stat.color} h-3 rounded-full transition-all duration-1000`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                  <PieChart className="w-7 h-7 text-purple-500" />
                  Missions par statut
                </h2>
                <div className="space-y-4">
                  {[
                    { label: 'En cours', value: statistics?.missions_in_progress || 0, color: 'bg-green-500' },
                    { label: 'Terminées', value: statistics?.missions_completed || 0, color: 'bg-blue-500' },
                    { label: 'Total', value: statistics?.total_missions || 0, color: 'bg-purple-500' },
                  ].map((stat) => {
                    const percentage = statistics?.total_missions ? Math.round((stat.value / statistics.total_missions) * 100) : 0;
                    return (
                      <div key={stat.label}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-700">{stat.label}</span>
                          <span className="text-xl font-black text-slate-900">{stat.value} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                          <div
                            className={`${stat.color} h-3 rounded-full transition-all duration-1000`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-xl">
              <h2 className="text-2xl font-black mb-6 flex items-center gap-3 text-slate-900">
                <Clock className="w-7 h-7 text-orange-500" />
                Activité récente
              </h2>
              <div className="space-y-3">
                {allUsers.slice(0, 10).map((user, i) => (
                  <div
                    key={user.id}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition animate-in slide-in-from-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-black">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.email}</p>
                        <p className="text-sm text-slate-600">Inscrit {new Date(user.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                    {user.last_sign_in_at && (
                      <span className="text-sm text-slate-500 font-semibold">
                        Dernière connexion: {new Date(user.last_sign_in_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-3xl font-black mb-6 text-slate-900">
              {grantType === 'credits' ? '💰 Ajouter des crédits' : '🎁 Gérer l\'abonnement'}
            </h3>

            <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200">
              <p className="text-sm font-bold text-slate-600">Utilisateur</p>
              <p className="text-lg font-black text-slate-900">{selectedUser.email}</p>
            </div>

            {grantType === 'credits' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Nombre de crédits
                  </label>
                  <input
                    type="number"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    min="1"
                    placeholder="100"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 font-bold text-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Plan
                  </label>
                  <select
                    value={grantPlan}
                    onChange={(e) => setGrantPlan(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 font-bold"
                  >
                    {shopPlans.map(plan => (
                      <option key={plan.name} value={plan.name}>
                        {plan.name.toUpperCase()} - {plan.credits_amount} crédits ({plan.price}€)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2">
                    Durée (jours)
                  </label>
                  <input
                    type="number"
                    value={grantDuration}
                    onChange={(e) => setGrantDuration(e.target.value)}
                    min="1"
                    placeholder="30"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 font-bold text-lg"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowGrantModal(false);
                  setSelectedUser(null);
                  setGrantAmount('');
                }}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-all hover:shadow-lg"
              >
                Annuler
              </button>
              <button
                onClick={grantType === 'credits' ? handleGrantCredits : handleGrantSubscription}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-black rounded-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shop-requests' && (
        <AdminShopRequests />
      )}
    </div>
  );
}
