/**
 * BillingGate — Wrap CRM/Billing content to require a complete billing profile.
 * Shows a friendly redirect card when the profile is incomplete.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBillingProfileComplete } from '../pages/BillingProfile';
import { FileText, ArrowRight } from 'lucide-react';

interface BillingGateProps {
  children: React.ReactNode;
}

export default function BillingGate({ children }: BillingGateProps) {
  const { complete, loading } = useBillingProfileComplete();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (complete === false) {
    return (
      <div className="max-w-lg mx-auto mt-16">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Profil de facturation requis
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
            Pour accéder au CRM et à la facturation, complétez d'abord votre profil de facturation 
            (raison sociale, SIRET, adresse...).
          </p>
          <button
            onClick={() => navigate('/billing-profile')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all"
            style={{ backgroundColor: '#0066FF', boxShadow: '0 4px 14px rgba(0,102,255,0.3)' }}
          >
            Compléter mon profil
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
