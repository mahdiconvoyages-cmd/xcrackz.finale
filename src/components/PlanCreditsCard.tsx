import { useState, useEffect } from 'react';
import { Crown, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function PlanCreditsCard() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [planName, setPlanName] = useState<string>('Gratuit');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    if (!user) return;

    const creditsChannel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && 'balance' in payload.new) {
            setCredits(payload.new.balance as number);
          }
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel('user-subscriptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && 'plan' in payload.new) {
            const planNames: { [key: string]: string } = {
              'free': 'Gratuit',
              'basic': 'Basique',
              'pro': 'Pro',
              'premium': 'Premium',
              'enterprise': 'Enterprise',
              'business': 'Business'
            };
            setPlanName(planNames[payload.new.plan as string] || payload.new.plan as string);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [creditsResult, subscriptionResult] = await Promise.all([
        supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('plan')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()
      ]);

      if (creditsResult.data?.balance !== undefined) {
        setCredits(creditsResult.data.balance);
      } else {
        setCredits(0);
      }

      if (subscriptionResult.data?.plan) {
        const planNames: { [key: string]: string } = {
          'free': 'Gratuit',
          'basic': 'Basique',
          'pro': 'Pro',
          'premium': 'Premium',
          'enterprise': 'Enterprise',
          'business': 'Business'
        };
        setPlanName(planNames[subscriptionResult.data.plan] || subscriptionResult.data.plan);
      }
    } catch (error) {
      console.error('Error loading plan and credits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-400/30 shadow-xl rounded-2xl p-6 animate-pulse">
        <div className="h-14 w-14 bg-amber-400/30 rounded-2xl mb-4"></div>
        <div className="h-4 bg-amber-400/30 rounded w-20 mb-2"></div>
        <div className="h-8 bg-amber-400/30 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-400/30 shadow-xl rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group">
      <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
        <Crown className="w-6 h-6 text-white" />
      </div>
      <p className="text-slate-600 text-sm font-semibold mb-2">Abonnement</p>
      <div className="flex flex-col gap-2">
        <p className="text-2xl font-black text-slate-800">
          {planName}
        </p>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
          <Coins className="w-4 h-4 text-yellow-600" />
          <span className="text-sm font-bold text-yellow-700">{credits} crédits</span>
        </div>
      </div>
    </div>
  );
}
