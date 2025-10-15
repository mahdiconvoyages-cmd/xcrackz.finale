import { useState } from 'react';
import { Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { searchBySiret, formatSiret } from '../services/inseeService';

/**
 * Composant de test pour l'API INSEE
 * Permet de tester rapidement des SIRET
 */
export default function InseeApiTester() {
  const [siret, setSiret] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testSirets = [
    { siret: '55208673700039', name: 'Google France' },
    { siret: '88091431100019', name: 'La Poste' },
    { siret: '55200155800027', name: 'Microsoft France' },
    { siret: '87925905400018', name: 'SNCF' },
    { siret: '53080213200025', name: 'Amazon France' }
  ];

  const handleTest = async (testSiret?: string) => {
    const siretToTest = testSiret || siret;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const company = await searchBySiret(siretToTest);
      if (company) {
        setResult(company);
      } else {
        setError('SIRET non trouvé dans la base INSEE');
      }
    } catch (err) {
      setError(`Erreur API: ${err instanceof Error ? err.message : 'Inconnu'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-6 z-50">
      <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
        🧪 Test API INSEE
      </h3>

      {/* Input SIRET */}
      <div className="mb-4">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          SIRET à tester
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={siret}
            onChange={(e) => setSiret(e.target.value)}
            placeholder="14 chiffres"
            className="flex-1 px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            maxLength={17}
          />
          <button
            onClick={() => handleTest()}
            disabled={loading || siret.length < 14}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* SIRET de test rapides */}
      <div className="mb-4">
        <p className="text-xs font-bold text-slate-700 mb-2">Tests rapides :</p>
        <div className="flex flex-wrap gap-2">
          {testSirets.map((test) => (
            <button
              key={test.siret}
              onClick={() => {
                setSiret(test.siret);
                handleTest(test.siret);
              }}
              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
            >
              {test.name}
            </button>
          ))}
        </div>
      </div>

      {/* Résultat */}
      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 text-blue-700">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-semibold">Recherche en cours...</span>
          </div>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">Entreprise trouvée !</span>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-bold text-slate-700">SIRET :</span>
              <span className="ml-2 font-mono">{formatSiret(result.siret)}</span>
            </div>
            <div>
              <span className="font-bold text-slate-700">Nom :</span>
              <span className="ml-2">{result.denomination}</span>
            </div>
            {result.nomCommercial && (
              <div>
                <span className="font-bold text-slate-700">Enseigne :</span>
                <span className="ml-2">{result.nomCommercial}</span>
              </div>
            )}
            <div>
              <span className="font-bold text-slate-700">Adresse :</span>
              <span className="ml-2">
                {result.adresse.numeroVoie} {result.adresse.typeVoie} {result.adresse.libelleVoie}{' '}
                {result.adresse.codePostal} {result.adresse.libelleCommune}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            <span className="font-bold">{error}</span>
          </div>
          <p className="text-xs text-red-600 mt-2">
            Essayez un SIRET de test ci-dessus ou vérifiez le numéro sur{' '}
            <a
              href="https://annuaire-entreprises.data.gouv.fr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              annuaire-entreprises.data.gouv.fr
            </a>
          </p>
        </div>
      )}

      {/* Aide */}
      <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
        <p className="font-bold mb-1">💡 Astuce :</p>
        <p>L'API INSEE ne contient que les entreprises françaises actives. Utilisez les boutons ci-dessus pour tester avec des SIRET garantis.</p>
      </div>
    </div>
  );
}
