#!/bin/bash
# Force npm install au lieu de npm ci pour respecter .npmrc

echo "🔧 Hook: Force npm install avec --legacy-peer-deps"

# Supprimer node_modules si existe
rm -rf node_modules

# Installer avec npm install (pas npm ci)
npm install --legacy-peer-deps

echo "✅ npm install terminé avec --legacy-peer-deps"
