# 🔐 Guide d'Activation de l'Authentification Google OAuth

## ✅ **VOTRE CODE EST DÉJÀ PRÊT !**

L'authentification Google est **déjà implémentée** dans votre application. Il ne reste plus qu'à la configurer dans Supabase.

---

## 📋 **Étapes de Configuration**

### **Étape 1 : Créer un Projet Google Cloud**

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez-en un existant
3. Notez le **Project ID**

---

### **Étape 2 : Configurer l'Écran de Consentement OAuth**

1. Dans le menu latéral, allez à **APIs & Services** → **OAuth consent screen**
2. Choisissez **External** (pour tous les utilisateurs)
3. Remplissez les informations :
   ```
   App name: xCrackz
   User support email: votre-email@example.com
   Developer contact: votre-email@example.com
   ```
4. Ajoutez les scopes nécessaires :
   - `userinfo.email`
   - `userinfo.profile`
5. Cliquez sur **Save and Continue**

---

### **Étape 3 : Créer les Identifiants OAuth 2.0**

1. Allez à **APIs & Services** → **Credentials**
2. Cliquez sur **Create Credentials** → **OAuth client ID**
3. Choisissez **Web application**
4. Configurez :

   **Nom de l'application :**
   ```
   xCrackz Web Client
   ```

   **Origines JavaScript autorisées :**
   ```
   https://localhost:5173
   https://votre-domaine.com
   https://bfrkthzovwpjrvqktdjn.supabase.co
   ```

   **URI de redirection autorisés :**
   ```
   https://bfrkthzovwpjrvqktdjn.supabase.co/auth/v1/callback
   ```

5. Cliquez sur **Create**
6. **IMPORTANT** : Copiez ces deux valeurs :
   - `Client ID` (ressemble à : `xxxxx.apps.googleusercontent.com`)
   - `Client Secret` (ressemble à : `GOCSPX-xxxxx`)

---

### **Étape 4 : Configurer Supabase**

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez à **Authentication** → **Providers**
4. Trouvez **Google** dans la liste
5. Activez Google OAuth
6. Collez vos identifiants :
   ```
   Client ID: [Votre Client ID de l'étape 3]
   Client Secret: [Votre Client Secret de l'étape 3]
   ```
7. Copiez l'URL de callback Supabase :
   ```
   https://bfrkthzovwpjrvqktdjn.supabase.co/auth/v1/callback
   ```
8. Cliquez sur **Save**

---

### **Étape 5 : Retourner sur Google Cloud Console**

1. Retournez sur **Google Cloud Console** → **Credentials**
2. Cliquez sur votre OAuth 2.0 Client ID créé précédemment
3. Vérifiez que l'URI de redirection correspond exactement :
   ```
   https://bfrkthzovwpjrvqktdjn.supabase.co/auth/v1/callback
   ```
4. Si ce n'est pas le cas, ajoutez-le et sauvegardez

---

## ✅ **Configuration Terminée !**

### **Test de Connexion**

1. Allez sur votre page de connexion : `https://localhost:5173/login`
2. Cliquez sur **"Continuer avec Google"**
3. Sélectionnez votre compte Google
4. Acceptez les permissions
5. Vous serez redirigé vers `/dashboard`

---

## 🔧 **Code Déjà Implémenté**

### **AuthContext.tsx**
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

### **Login.tsx**
```typescript
const handleGoogleSignIn = async () => {
  setError('');
  setGoogleLoading(true);

  try {
    await signInWithGoogle();
  } catch (err: any) {
    setError(err.message || 'Erreur lors de la connexion avec Google');
    setGoogleLoading(false);
  }
};
```

---

## 🎯 **Fonctionnalités Actives**

✅ **Connexion Email/Password**
- Validation des champs
- Gestion d'erreurs claire
- Autocomplete HTML5
- Toggle mot de passe (Eye/EyeOff)

✅ **Connexion Google OAuth**
- Bouton stylé avec Chrome icon
- Loading states séparés
- Redirection automatique vers dashboard
- Gestion d'erreurs

✅ **UX/UI Moderne**
- Design 2-colonnes (desktop)
- Animations fluides
- Responsive mobile
- Messages d'erreur clairs
- Pattern SVG background
- Glassmorphism

---

## 🐛 **Dépannage**

### **Erreur : "redirect_uri_mismatch"**
**Solution :** Vérifiez que l'URI de redirection dans Google Cloud Console correspond **EXACTEMENT** à :
```
https://bfrkthzovwpjrvqktdjn.supabase.co/auth/v1/callback
```

### **Erreur : "Access blocked: This app's request is invalid"**
**Solution :**
1. Vérifiez que l'écran de consentement OAuth est configuré
2. Ajoutez votre email comme testeur dans Google Cloud Console
3. Publiez l'application (status: In Production)

### **Erreur : "The OAuth client was not found"**
**Solution :** Vérifiez que le Client ID dans Supabase correspond à celui de Google Cloud Console

### **Connexion réussie mais pas de profil créé**
**Solution :** Supabase crée automatiquement l'entrée dans `auth.users`. Vous devez créer un trigger pour créer le profil :

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📱 **Domaines de Production**

Quand vous déployez en production, ajoutez vos domaines :

**Google Cloud Console → Credentials :**
```
Origines JavaScript autorisées:
- https://votre-domaine.com
- https://app.votre-domaine.com

URI de redirection autorisés:
- https://bfrkthzovwpjrvqktdjn.supabase.co/auth/v1/callback
```

**Supabase Dashboard → URL Configuration :**
```
Site URL: https://votre-domaine.com
Redirect URLs:
- https://votre-domaine.com/**
- https://app.votre-domaine.com/**
```

---

## 🌟 **Résultat Final**

Une fois configuré, vos utilisateurs pourront :

✅ Se connecter avec email/password
✅ Se connecter avec Google (1 clic)
✅ Créer un compte avec Google (auto)
✅ Lier plusieurs méthodes de connexion

---

## 📞 **Support**

En cas de problème :
1. Vérifiez les logs Supabase : **Dashboard → Logs**
2. Vérifiez les logs Google : **Cloud Console → APIs & Services → Credentials → View logs**
3. Testez avec `console.log(error)` dans `handleGoogleSignIn()`

---

**🎉 Votre authentification Google OAuth est maintenant prête à être activée !**
