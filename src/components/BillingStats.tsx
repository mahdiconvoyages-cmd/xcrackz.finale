import { FileText, Euro, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface BillingStatsProps {
  totalInvoices: number;
  totalQuotes: number;
  totalRevenue: number;
  pendingAmount: number;
  paidInvoices: number;
  overdueInvoices: number;
  period?: 'month' | 'year' | 'all';
}

export default function BillingStats({
  totalInvoices,
  totalQuotes,
  totalRevenue,
  pendingAmount,
  paidInvoices,
  overdueInvoices,
  period = 'month'
}: BillingStatsProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'month': return 'ce mois';
      case 'year': return 'cette année';
      default: return 'au total';
    }
  };

  const stats = [
    {
      label: 'Factures émises',
      value: totalInvoices,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: getPeriodLabel()
    },
    {
      label: 'Devis créés',
      value: totalQuotes,
      icon: FileText,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      subtitle: getPeriodLabel()
    },
    {
      label: 'Chiffre d\'affaires',
      value: formatCurrency(totalRevenue),
      icon: Euro,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      subtitle: `${paidInvoices} factures payées`,
      trend: totalRevenue > 0 ? 'up' : null
    },
    {
      label: 'En attente',
      value: formatCurrency(pendingAmount),
      icon: Clock,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      subtitle: `${overdueInvoices} en retard`,
      trend: pendingAmount > 0 ? 'down' : null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                <Icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              {stat.trend && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  stat.trend === 'up' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.trend === 'up' ? '+' : ''}
                </div>
              )}
            </div>
            
            <div>
              <p className="text-sm text-slate-600 font-medium mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 mb-2">
                {stat.value}
              </p>
              <p className="text-xs text-slate-500">{stat.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
