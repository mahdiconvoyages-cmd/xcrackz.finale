#!/bin/bash

# 🔧 Script de debug pré-installation EAS
echo "======================================"
echo "🔍 PRE-INSTALL DEBUG"
echo "======================================"

echo "📦 Node version:"
node --version

echo "📦 NPM version:"
npm --version

echo "📂 Current directory:"
pwd

echo "📄 Files in directory:"
ls -la

echo "📦 Package.json exists:"
test -f package.json && echo "✅ YES" || echo "❌ NO"

echo "📦 .npmrc exists:"
test -f .npmrc && echo "✅ YES - Content:" && cat .npmrc || echo "❌ NO"

echo "======================================"
echo "✅ Pre-install checks complete"
echo "======================================"
