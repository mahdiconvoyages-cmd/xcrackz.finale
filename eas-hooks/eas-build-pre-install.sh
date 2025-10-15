#!/usr/bin/env bash

# EAS Build Pre-Install Hook
# This script runs BEFORE npm install, so we can configure Gradle before dependencies are resolved

set -e

echo "========================================="
echo "🔧 EAS Build Pre-Install Hook Starting"
echo "========================================="

# Configure npm to use legacy-peer-deps
echo "📦 Configuring npm to use --legacy-peer-deps..."
npm config set legacy-peer-deps true
echo "✅ npm configured with legacy-peer-deps=true"
echo ""

# Check if MAPBOX_DOWNLOADS_TOKEN is set
if [ -z "$MAPBOX_DOWNLOADS_TOKEN" ]; then
  echo "❌ ERROR: MAPBOX_DOWNLOADS_TOKEN environment variable is not set!"
  echo "Please ensure the secret is configured in EAS and referenced in eas.json"
  exit 1
fi

echo "✅ MAPBOX_DOWNLOADS_TOKEN is set (length: ${#MAPBOX_DOWNLOADS_TOKEN})"

# Path to gradle.properties
GRADLE_PROPS="android/gradle.properties"

# Check if gradle.properties exists
if [ ! -f "$GRADLE_PROPS" ]; then
  echo "⚠️  gradle.properties not found, creating it..."
  touch "$GRADLE_PROPS"
fi

# Remove any existing MAPBOX_DOWNLOADS_TOKEN line
sed -i '/MAPBOX_DOWNLOADS_TOKEN/d' "$GRADLE_PROPS" 2>/dev/null || true

# Add the token
echo "" >> "$GRADLE_PROPS"
echo "# Mapbox Downloads Token (injected by EAS Build hook)" >> "$GRADLE_PROPS"
echo "MAPBOX_DOWNLOADS_TOKEN=$MAPBOX_DOWNLOADS_TOKEN" >> "$GRADLE_PROPS"

echo "✅ Mapbox token added to android/gradle.properties"
echo ""
echo "📄 gradle.properties content (last 5 lines):"
tail -n 5 "$GRADLE_PROPS"

echo ""
echo "========================================="
echo "✅ Pre-Install Hook Completed Successfully"
echo "========================================="
