import { useState } from 'react';
import { Building2, FileText, Receipt, TrendingUp } from 'lucide-react';
import Clients from './Clients';
import QuoteGenerator from './QuoteGenerator';
import Billing from './Billing';

type TabType = 'clients' | 'quotes' | 'invoices';

export default function CRM() {
  const [activeTab, setActiveTab] = useState<TabType>('clients');

  const tabs = [
    { 
      id: 'clients' as TabType, 
      label: 'Clients', 
      icon: Building2, 
      color: 'from-indigo-500 to-purple-500',
      badge: null 
    },
    { 
      id: 'quotes' as TabType, 
      label: 'Devis', 
      icon: FileText, 
      color: 'from-blue-500 to-cyan-500',
      badge: null 
    },
    { 
      id: 'invoices' as TabType, 
      label: 'Facturation', 
      icon: Receipt, 
      color: 'from-green-500 to-emerald-500',
      badge: null 
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Banner Image avec Overlay - Responsive */}
      <div className="relative w-full bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 shadow-lg">
        {/* Image de fond responsive */}
        <div className="overflow-hidden flex items-center justify-center h-[300px] sm:h-[400px] md:h-[450px] lg:h-[500px]">
          <img 
            src="/crm-illustration.png"
            alt="CRM - Facturation, Devis, Tarifs" 
            className="w-full h-full object-cover sm:object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        {/* Overlay avec Titre et Boutons */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60 flex flex-col items-center justify-center px-3 sm:px-4 md:px-6 py-4 sm:py-6">
          {/* Titre */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 drop-shadow-xl">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-white drop-shadow-xl" />
              <span className="text-center">CRM & Gestion Commerciale</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 font-semibold max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto drop-shadow-lg px-4">
              Gérez vos clients, devis et factures en un seul endroit
            </p>
          </div>

          {/* Tabs Navigation */}
          <div className="flex flex-wrap gap-2 md:gap-3 justify-center max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative px-3 sm:px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl font-bold text-xs sm:text-sm md:text-base transition-all duration-300 transform
                    ${isActive 
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-2xl scale-105' 
                      : 'bg-white/90 backdrop-blur-md text-teal-700 hover:bg-white hover:scale-102 border-2 border-teal-400/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 ${isActive ? 'animate-pulse' : ''}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </div>
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-lg`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'quotes' && <QuoteGenerator />}
          {activeTab === 'invoices' && <Billing />}
        </div>
      </div>
    </div>
  );
}
