# Configuration Google OAuth avec Supabase

## Étape 1: Configuration Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google+ (nécessaire pour OAuth)

### Créer les identifiants OAuth 2.0

1. Allez dans **APIs & Services** > **Credentials**
2. Cliquez sur **Create Credentials** > **OAuth client ID**
3. Sélectionnez **Web application**
4. Configurez:
   - **Name**: xCrackz
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (développement)
     - Votre domaine de production
   - **Authorized redirect URIs**:
     - `https://[VOTRE_PROJET_ID].supabase.co/auth/v1/callback`

5. Copiez le **Client ID** et **Client Secret**

## Étape 2: Configuration Supabase

1. Connectez-vous à [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Authentication** > **Providers**
4. Activez **Google**
5. Collez:
   - **Client ID** (depuis Google Cloud Console)
   - **Client Secret** (depuis Google Cloud Console)
6. Cliquez sur **Save**

## Étape 3: Configuration terminée

L'intégration Google OAuth est maintenant active. Les utilisateurs peuvent:

- Se connecter avec Google depuis la page `/login`
- S'inscrire avec Google depuis la page `/register`
- Les profils sont automatiquement créés dans votre base de données

## Code déjà implémenté

Le code suivant est déjà en place dans votre application:

### AuthContext (`src/contexts/AuthContext.tsx`)

```typescript
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  if (error) throw error;
};
```

### Pages Login et Register

Les deux pages incluent un bouton "Continuer avec Google" qui appelle automatiquement `signInWithGoogle()`.

## Flux utilisateur

1. L'utilisateur clique sur "Continuer avec Google"
2. Redirection vers Google pour l'authentification
3. Après autorisation, redirection vers `/dashboard`
4. L'utilisateur est automatiquement connecté
5. Un profil est créé dans la table `profiles` si c'est la première connexion

## Notes importantes

- La configuration Google nécessite un domaine vérifié pour la production
- Les utilisateurs Google sont automatiquement vérifiés (pas besoin de confirmation email)
- Les emails Google sont stockés dans la table `auth.users` de Supabase
- Le plan gratuit Supabase supporte jusqu'à 50,000 utilisateurs actifs mensuels
