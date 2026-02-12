import { Lock, ShoppingCart, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SubscriptionRequiredProps {
  feature?: string;
  daysRemaining?: number | null;
  expiresAt?: string | null;
}

export default function SubscriptionRequired({ feature = 'cette fonctionnalité', daysRemaining, expiresAt }: SubscriptionRequiredProps) {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 border-2 border-orange-400/30 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-6 shadow-lg">
              <Lock className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {isExpired ? 'Abonnement expiré' : 'Abonnement requis'}
            </h2>

            {isExpired ? (
              <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-red-700 font-semibold mb-2">
                  <Clock className="w-5 h-5" />
                  <span>Votre abonnement a expiré</span>
                </div>
                <p className="text-red-600 text-sm">
                  Date d'expiration: {new Date(expiresAt).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Paris'
                  })}
                </p>
              </div>
            ) : daysRemaining !== null && daysRemaining !== undefined && daysRemaining > 0 ? (
              <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-amber-700 font-semibold mb-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Abonnement bientôt expiré</span>
                </div>
                <p className="text-amber-600 text-sm">
                  {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                </p>
              </div>
            ) : null}

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Pour accéder à <span className="font-bold text-slate-900">{feature}</span>, vous devez disposer d'un abonnement actif.
            </p>

            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 mb-8 border border-teal-200">
              <h3 className="font-bold text-teal-900 mb-3 flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Tout abonnement donne accès à l'intégralité de la plateforme :
              </h3>
              <ul className="text-left space-y-2 max-w-md mx-auto">
                <li className="flex items-center gap-2 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                  <span>Missions, inspections, GPS, facturation</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                  <span>CRM, contacts, gestion clients</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                  <span>Scanner de documents & rapports PDF</span>
                </li>
                <li className="flex items-center gap-2 text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                  <span>Aucune restriction — seuls les crédits varient selon le plan</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link
                to="/shop"
                className="block w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-lg"
              >
                <div className="flex items-center justify-center gap-3">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Demander un abonnement</span>
                </div>
              </Link>

              <Link
                to="/dashboard"
                className="block w-full py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all duration-300"
              >
                Retour au tableau de bord
              </Link>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              <p>💡 Les abonnements sont valables 30 jours</p>
              <p className="mt-1">Les crédits ne sont pas cumulables entre les renouvellements</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
