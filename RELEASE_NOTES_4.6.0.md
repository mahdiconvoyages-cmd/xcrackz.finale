# xCrackz Mobile 4.6.0 - APK release (Android versionCode: 2)

Date: 2025-11-11
APK: https://expo.dev/artifacts/eas/qteFd2oCGibKVEaNE9hLKD.apk

## Nouveautés et correctifs

- Unification des codes de partage (format XZ-ABC-123) sur Web/Mobile/DB
  - Côté Web: `src/lib/shareCode.ts` nettoie toute saisie (retire non-alphanumériques), reconstruit `XZ-ABC-123`, et valide via regex sans I/O/0/1.
  - Modal Web: `src/components/JoinMissionModal.tsx` active le bouton seulement quand la saisie nettoyée a 8 caractères.
  - Côté Mobile: l’UI formatte à la volée et n’exige plus strictement les tirets (aligné avec la RPC qui normalise).
  - DB: RPC `join_mission_with_code` compare avec `REGEXP_REPLACE` des deux côtés (tolérance tirets/espaces).

- Correctif build Android (TypeScript)
  - `mobile/src/screens/missions/MissionListScreenNew.tsx`: séparation en 2 FlatList typées pour éviter le conflit `Mission[] | Assignment[]` (TS2769).
  - Résultat: build Android APK OK (production-apk).

- Page téléchargement Web mise à jour
  - `src/pages/MobileDownload.tsx`: lien APK pointant vers le dernier artifact EAS.

## Lien de téléchargement

- Android APK direct: https://expo.dev/artifacts/eas/qteFd2oCGibKVEaNE9hLKD.apk

## Notes techniques

- EAS profile: `production-apk` (buildType: apk).
- `android.versionCode`: 2 (synchronisé par EAS durant le build).
- `expo.version`: 4.6.0 (inchangé dans app.json pour cette livraison).

## Vérifications et tests

- Script SQL de test `TEST_SHARE_CODE_SYSTEM.sql`:
  - Génération de 200 codes: unicité + pattern OK.
  - Normalisation d’entrées: strip non-alphanumériques + reconstruction.
  - Insertion mission sans code: trigger génère `share_code` automatiquement.
  - Lecture des derniers codes générés pour inspection rapide.

## Actions recommandées (optionnel)

- Ajouter des tests unitaires Web pour `cleanShareCode`.
- Centraliser la logique de formatage mobile dans un utilitaire commun.
- Publier la version Play Store quand prête (le lien Play Store est présent en 'Bientôt').
