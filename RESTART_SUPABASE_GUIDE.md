## 🔄 REDÉMARRAGE SUPABASE REQUIS

Le cache de PostgREST est têtu. Voici comment forcer le rechargement :

### Option 1 : Pause/Resume (RECOMMANDÉ) ⚡
1. Allez sur https://supabase.com/dashboard/project/bfrkthzovwpjrvqktdjn
2. Cliquez sur **Settings** (en bas à gauche)
3. Allez dans **General**
4. Descendez jusqu'à **Pause project**
5. Cliquez sur **Pause project** et confirmez
6. Attendez 30 secondes
7. Cliquez sur **Resume project**
8. Attendez que le projet redémarre (2-3 minutes)

### Option 2 : Restart PostgREST uniquement 🔧
Dans le SQL Editor de Supabase, exécutez :
```sql
-- Tuer les connexions PostgREST
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE application_name = 'PostgREST';

-- Forcer reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```

### Option 3 : Vérification manuelle 🔍
Vérifiez la version de la fonction actuellement utilisée :
```sql
-- Voir le code source de la fonction actuellement en mémoire
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'join_mission_with_code';
```

### Après le redémarrage :
1. Rechargez votre application web (Ctrl + Shift + R)
2. Testez avec le code : **XZ-2JB-EGX**
   - ✅ Vous n'êtes PAS le créateur (c37f15d6...)
   - ✅ Mission disponible
3. La fonction devrait maintenant fonctionner

---

**POURQUOI CE PROBLÈME ?**

PostgREST compile les fonctions SQL en mémoire et les met en cache.
Même après DROP + CREATE, il peut garder l'ancienne version jusqu'au redémarrage.
Le NOTIFY devrait suffire, mais parfois il faut forcer un redémarrage complet.
