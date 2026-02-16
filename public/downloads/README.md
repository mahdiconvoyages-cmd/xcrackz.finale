# Dossier de téléchargement d'applications mobiles

Ce dossier contient les fichiers APK et autres ressources pour le téléchargement d'applications mobiles.

## Fichiers à ajouter

- `xcrackz.apk` - Application Android (à générer avec `eas build --platform android`)
- `xcrackz-latest.apk` - Dernière version Android

## URLs des stores (à mettre à jour)

### Android
- **Google Play Store**: `https://play.google.com/store/apps/details?id=com.xcrackz.app`
- **APK Direct**: `/downloads/xcrackz.apk`

### iOS
- **App Store**: `https://apps.apple.com/app/xcrackz/id123456789`
- **TestFlight**: (URL de beta test)

## Build APK

Pour générer l'APK Android :
```bash
cd mobile
eas build --platform android --profile production
```

Le fichier généré doit être placé dans ce dossier.
