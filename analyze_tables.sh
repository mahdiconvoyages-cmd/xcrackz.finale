#!/bin/bash

# Script pour analyser toutes les tables utilisées dans le code

echo "=== TABLES UTILISÉES DANS LE CODE ==="
echo ""

# Extraire toutes les tables mentionnées dans .from()
grep -r "\.from(['\"]" src --include="*.tsx" --include="*.ts" | \
  sed -E "s/.*\.from\(['\"]([^'\"]+)['\"].*/\1/" | \
  sort | uniq | grep -v "^$" | \
  while read table; do
    echo "- $table"
  done

echo ""
echo "=== TABLES DANS LES MIGRATIONS ==="
echo ""

# Chercher CREATE TABLE dans les migrations
grep -h "CREATE TABLE" supabase/migrations/*.sql | \
  sed -E "s/.*CREATE TABLE (IF NOT EXISTS )?([a-zA-Z_]+).*/\2/" | \
  sort | uniq | \
  while read table; do
    echo "- $table"
  done
