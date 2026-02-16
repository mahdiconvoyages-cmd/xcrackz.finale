# Shared Code - Web & Mobile

Ce dossier contient le code **partagé** entre l'application web et mobile.

## Structure

```
shared/
├── types/          # Types TypeScript
├── utils/          # Fonctions utilitaires
└── constants/      # Constantes
```

## Utilisation

### Types

```typescript
import { Mission, Profile, Vehicle } from '../shared/types';
```

### Utils

```typescript
import { formatDate, formatCurrency, validateEmail } from '../shared/utils';
```

### Constants

```typescript
import { MISSION_STATUSES, COLORS } from '../shared/constants';
```

## Documentation

Voir `SYNC_DOCUMENTATION.md` à la racine pour plus de détails.
