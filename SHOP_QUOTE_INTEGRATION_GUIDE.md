# 🛍️ AJOUT SECTION "DEMANDES BOUTIQUE" DANS ADMIN SUPPORT

## Fichiers modifiés
- `src/pages/AdminSupport.tsx`

## Changements à apporter

### 1. Ajout de l'interface QuoteRequest

```typescript
interface QuoteRequest {
  id: string;
  user_id: string;
  company_name: string;
  email: string;
  phone: string;
  expected_volume: string;
  message: string;
  status: 'pending' | 'contacted' | 'quoted' | 'closed' | 'rejected';
  admin_notes: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}
```

### 2. Ajout des states

```typescript
const [activeTab, setActiveTab] = useState<'conversations' | 'quotes'>('conversations');
const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
const [filteredQuotes, setFilteredQuotes] = useState<QuoteRequest[]>([]);
const [quoteStatusFilter, setQuoteStatusFilter] = useState<string>('all');
const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
```

### 3. Ajout de la fonction loadQuoteRequests

```typescript
const loadQuoteRequests = async () => {
  try {
    const { data, error } = await supabase
      .from('shop_quote_requests')
      .select(`
        *,
        profiles!shop_quote_requests_user_id_fkey(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setQuoteRequests(data || []);
    setFilteredQuotes(data || []);
  } catch (error) {
    console.error('Error loading quote requests:', error);
  }
};
```

### 4. Modifier le useEffect pour charger les demandes

```typescript
useEffect(() => {
  loadConversations();
  loadStats();
  loadQuoteRequests(); // AJOUTER CETTE LIGNE
  
  // ... reste du code
});
```

### 5. Ajouter le filtrage des quotes

```typescript
useEffect(() => {
  let filtered = quoteRequests;
  
  if (quoteStatusFilter !== 'all') {
    filtered = filtered.filter(q => q.status === quoteStatusFilter);
  }
  
  if (searchQuery) {
    filtered = filtered.filter(q => 
      q.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  setFilteredQuotes(filtered);
}, [quoteRequests, quoteStatusFilter, searchQuery]);
```

### 6. Fonction pour mettre à jour le statut

```typescript
const handleUpdateQuoteStatus = async (quoteId: string, newStatus: string, notes?: string) => {
  try {
    const { error } = await supabase
      .from('shop_quote_requests')
      .update({
        status: newStatus,
        admin_notes: notes || null,
        responded_at: newStatus !== 'pending' ? new Date().toISOString() : null,
        responded_by: newStatus !== 'pending' ? user?.id : null
      })
      .eq('id', quoteId);

    if (error) throw error;
    
    await loadQuoteRequests();
    alert('Statut mis à jour avec succès !');
  } catch (error) {
    console.error('Error updating quote status:', error);
    alert('Erreur lors de la mise à jour');
  }
};
```

### 7. UI - Tabs de navigation (à insérer après le header)

```tsx
{/* Tabs Navigation */}
<div className="flex gap-2 mb-6">
  <button
    onClick={() => setActiveTab('conversations')}
    className={`px-6 py-3 rounded-xl font-bold transition-all ${
      activeTab === 'conversations'
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
        : 'bg-white text-slate-700 hover:bg-slate-50'
    }`}
  >
    <MessageCircle className="w-5 h-5 inline mr-2" />
    Conversations
    {conversations.length > 0 && (
      <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">
        {conversations.length}
      </span>
    )}
  </button>
  
  <button
    onClick={() => setActiveTab('quotes')}
    className={`px-6 py-3 rounded-xl font-bold transition-all ${
      activeTab === 'quotes'
        ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
        : 'bg-white text-slate-700 hover:bg-slate-50'
    }`}
  >
    <ShoppingCart className="w-5 h-5 inline mr-2" />
    Demandes Boutique
    {quoteRequests.filter(q => q.status === 'pending').length > 0 && (
      <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">
        {quoteRequests.filter(q => q.status === 'pending').length}
      </span>
    )}
  </button>
</div>
```

### 8. Section Demandes Boutique (remplace le contenu conditionnel)

```tsx
{activeTab === 'quotes' && (
  <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-black text-slate-900">Demandes de Devis</h2>
      
      {/* Filtres */}
      <div className="flex gap-2">
        <select
          value={quoteStatusFilter}
          onChange={(e) => setQuoteStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-slate-300 font-medium"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="contacted">Contacté</option>
          <option value="quoted">Devis envoyé</option>
          <option value="closed">Accepté</option>
          <option value="rejected">Refusé</option>
        </select>
      </div>
    </div>

    {/* Liste des demandes */}
    <div className="space-y-4">
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p>Aucune demande de devis</p>
        </div>
      ) : (
        filteredQuotes.map((quote) => (
          <div
            key={quote.id}
            className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedQuote(quote)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{quote.company_name}</h3>
                <p className="text-sm text-slate-600">{quote.profiles.full_name} • {quote.email}</p>
              </div>
              
              <span className={`px-4 py-2 rounded-full font-bold text-sm ${
                quote.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                quote.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                quote.status === 'quoted' ? 'bg-purple-100 text-purple-800' :
                quote.status === 'closed' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {quote.status === 'pending' ? '⏳ En attente' :
                 quote.status === 'contacted' ? '📞 Contacté' :
                 quote.status === 'quoted' ? '📄 Devis envoyé' :
                 quote.status === 'closed' ? '✅ Accepté' :
                 '❌ Refusé'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Téléphone</p>
                <p className="text-sm font-bold text-slate-900">{quote.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Volume estimé</p>
                <p className="text-sm font-bold text-slate-900">{quote.expected_volume || 'Non spécifié'}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 font-semibold mb-1">Message</p>
              <p className="text-sm text-slate-700 line-clamp-2">{quote.message}</p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR')}</span>
              {quote.responded_at && (
                <span>Répondu le {new Date(quote.responded_at).toLocaleDateString('fr-FR')}</span>
              )}
            </div>

            {/* Actions rapides */}
            <div className="mt-4 flex gap-2">
              {quote.status === 'pending' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateQuoteStatus(quote.id, 'contacted');
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600"
                >
                  Marquer comme contacté
                </button>
              )}
              {quote.status === 'contacted' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateQuoteStatus(quote.id, 'quoted');
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold text-sm hover:bg-purple-600"
                >
                  Marquer devis envoyé
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
)}
```

## Icônes à ajouter dans l'import

```typescript
import {
  // ... imports existants
  ShoppingCart, FileText, Building2
} from 'lucide-react';
```

## Ordre d'implémentation

1. ✅ Créer la table `shop_quote_requests` dans Supabase
2. ✅ Créer `Shop_NEW.tsx` avec le formulaire de devis
3. 📝 Modifier `AdminSupport.tsx` pour ajouter l'onglet "Demandes Boutique"
4. 🧪 Tester le flux complet : soumission → affichage admin → changement statut
5. 🚀 Activer Shop_NEW.tsx en production

## Note importante

Les modifications d'AdminSupport.tsx sont substantielles. Il est recommandé de :
- Sauvegarder l'ancienne version
- Tester en développement avant de déployer
- Vérifier les RLS policies sur la table shop_quote_requests
