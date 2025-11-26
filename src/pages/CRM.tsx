import { useState } from 'react';
import { Building2, FileText, Receipt, TrendingUp, Sparkles } from 'lucide-react';
import Clients from './Clients';
import QuoteGenerator from './QuoteGenerator';
import Billing from './Billing';
import { PageHeader } from '../components/ui';

type TabType = 'clients' | 'quotes' | 'invoices';

export default function CRM() {
  const [activeTab, setActiveTab] = useState<TabType>('clients');

  const tabs = [
    { 
      id: 'clients' as TabType, 
      label: 'Clients', 
      icon: Building2
    },
    { 
      id: 'quotes' as TabType, 
      label: 'Devis', 
      icon: FileText
    },
    { 
      id: 'invoices' as TabType, 
      label: 'Facturation', 
      icon: Receipt
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 p-4 md:p-6 space-y-6">
      {/* Header avec design unifié */}
      <PageHeader
        title="CRM & Gestion Commerciale"
        description="Gérez vos clients, devis et factures en un seul endroit"
        icon={TrendingUp}
      >
        {/* Tabs Navigation intégrée dans le header */}
        <div className="flex flex-wrap gap-2 md:gap-3 mt-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 
                  rounded-xl font-bold text-sm md:text-base 
                  transition-all duration-300 transform
                  ${isActive 
                    ? 'bg-white text-teal-700 shadow-lg scale-105' 
                    : 'bg-white/20 text-white/90 hover:bg-white/30 hover:scale-102 border border-white/20'
                  }
                `}
              >
                <Icon className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-teal-600' : ''}`} />
                <span>{tab.label}</span>
                
                {/* Active Indicator */}
                {isActive && (
                  <Sparkles className="w-4 h-4 text-teal-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </PageHeader>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-500">
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'quotes' && <QuoteGenerator />}
        {activeTab === 'invoices' && <Billing />}
      </div>
    </div>
  );
}
