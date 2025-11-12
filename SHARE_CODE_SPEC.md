# Spécification Code de Partage Missions

## Format Officiel
- Patron: `XZ-ABC-123`
- Longueur: 10 caractères (incluant deux tirets)
- Structure: `Prefix` ("XZ") + 3 caractères + 3 caractères
- Alphabet autorisé: `A B C D E F G H J K L M N P Q R S T U V W X Y Z 2 3 4 5 6 7 8 9`
  - Exclus: `I O 0 1` pour éviter les confusions visuelles.

## Génération
- Source d'autorité: Trigger Postgres `auto_generate_share_code` défini dans `MIGRATION_SHARE_CODE_SYSTEM.sql`.
- Fonction appelée: `generate_share_code()` (PL/pgSQL) avec tentative multi-réessais pour garantir unicité.
- Processus: côté client laisser `share_code` NULL lors de l'insertion; le trigger remplit automatiquement.

## Règles de Validation
1. Ignorer espaces et caractères non alphanumériques avant validation.
2. Reconstituer si l'utilisateur saisit sans tirets (ex: `XZABC123` -> `XZ-ABC-123`).
3. Expression régulière: `^XZ-[A-Z2-9]{3}-[A-Z2-9]{3}$`.
4. Les tirets doivent être aux positions index 2 et 6 (0-based) après formatage.

## Nettoyage / Normalisation Entrée
- Supprimer tous caractères `[^A-Za-z0-9]`.
- Uppercase systématique.
- Réinsérer les tirets: `slice(0,2)` + `-` + `slice(2,5)` + `-` + `slice(5,8)` si longueur brute = 8.

## Joindre une Mission
- RPC: `join_mission_with_code(p_share_code TEXT, p_user_id UUID)`.
- La fonction côté serveur re-nettoie l'entrée (`REGEXP_REPLACE`, `UPPER`) pour robustesse.
- Retour JSON uniformisé avec: `{ success, message, mission: { id, share_code, ... } }`.

## Interfaces Utilisateur
### Web
- Composant `JoinMissionModal.tsx` affiche placeholder `XZ-ABC-123`.
- Validation via utilitaires `validateShareCodeInput` dans `src/lib/shareCode.ts`.

### Mobile
- Composant `JoinMissionByCode.tsx` formate dynamiquement pendant saisie.
- Création de mission n'insère plus de code manuellement; rely trigger.

## Usages de Partage
- Copier dans presse-papier (Web & Mobile) avec message standard incluant lien APK.
- Message de partage utilitaire `getShareMessage(code, missionTitle?)`.

## Migration & Rétro-Compatibilité
- Anciennes missions sans code: script de backfill (voir section ÉTAPE 5 dans `MIGRATION_SHARE_CODE_SYSTEM.sql`).
- Ancien format support: saisies comme `xzabc123` ou `XZ ABC 123` reformatées.

## Sécurité
- `share_code` est public mais ne suffit pas pour accéder aux données sensibles sans RLS.
- Rejoindre mission nécessite authentification (user id passé à la RPC).
- Permissions d'exécution RPC: `GRANT EXECUTE ON FUNCTION join_mission_with_code(TEXT, UUID) TO authenticated, anon;` sont incluses dans `MIGRATION_SHARE_CODE_SYSTEM.sql`.
- La fonction normalise le code côté serveur via `REGEXP_REPLACE(..., '[^A-Za-z0-9]', '', 'g')` et `UPPER(...)` afin d'accepter les variantes d'entrée (avec/ sans tirets, espaces, etc.).

## Tests Recommandés
- Génération: 1000 codes consécutifs -> aucun doublon.
- Validation: cas valides, invalides (caractère exclu, taille incorrecte, mauvais préfixe).
- Joindre: code formaté vs code sans tirets -> résultat identique.
 - RPC permissions: vérifier que les rôles `authenticated` et `anon` peuvent appeler la fonction.

## Évolutions Futures (Optionnel)
- Préfixe dynamique selon organisation (ex: `FC-ABC-123`).
- Expiration de code (date limite) stockée en colonne dédiée.
- Rate limiting sur la RPC join pour éviter brute-force.

---
Document généré automatiquement pour centraliser la logique de codes de partage et garantir cohérence multi-plateforme.
