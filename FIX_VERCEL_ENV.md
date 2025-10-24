# CORRECTION URGENTE VERCEL

## Problème
Les variables d'environnement sur Vercel contiennent des `\r\n` (retours à la ligne).

## Solution

### 1. Aller sur Vercel Dashboard
https://vercel.com/xcrackz/xcrackz-11crss04e

### 2. Settings → Environment Variables

### 3. SUPPRIMER et RECRÉER ces variables:

**VITE_SUPABASE_URL:**
```
https://bfrkthzovwpjrvqktdjn.supabase.co
```
⚠️ **ATTENTION**: Copier SANS retour à la ligne, SANS espace à la fin!

**VITE_SUPABASE_ANON_KEY:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc
```
⚠️ **ATTENTION**: Copier SANS retour à la ligne!

### 4. Redéployer
Après avoir mis à jour les variables:
- Aller dans Deployments
- Cliquer "..." sur le dernier deployment
- Cliquer "Redeploy"

### 5. Vider cache navigateur
- F12 → Application → Clear site data
- Fermer et rouvrir le navigateur
