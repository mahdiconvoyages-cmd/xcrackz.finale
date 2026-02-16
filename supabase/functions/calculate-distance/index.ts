// Supabase Edge Function: calculate-distance
// Description: Calcule la distance réelle entre deux points via OpenRouteService
// Usage: POST avec { origin: [lon, lat], destination: [lon, lat] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Utiliser l'API key fournie directement ou depuis les variables d'environnement
const OPENROUTESERVICE_API_KEY = Deno.env.get('OPENROUTESERVICE_API_KEY') || 
  'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0='

interface CalculateDistanceRequest {
  origin: {
    lat: number
    lon: number
  }
  destination: {
    lat: number
    lon: number
  }
  profile?: 'driving-car' | 'driving-hgv' // car = léger/utilitaire, hgv = poids lourd
}

interface CalculateDistanceResponse {
  distance: number // en kilomètres
  duration: number // en secondes
  route: any // géométrie de la route (optionnel)
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!OPENROUTESERVICE_API_KEY) {
      throw new Error('OPENROUTESERVICE_API_KEY not configured')
    }

    const { origin, destination, profile = 'driving-car' }: CalculateDistanceRequest = await req.json()

    // Validation
    if (!origin?.lat || !origin?.lon || !destination?.lat || !destination?.lon) {
      return new Response(
        JSON.stringify({ error: 'Missing origin or destination coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Appel à OpenRouteService API
    const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}`
    
    const orsResponse = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'Authorization': OPENROUTESERVICE_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
      },
      body: JSON.stringify({
        coordinates: [
          [origin.lon, origin.lat],
          [destination.lon, destination.lat]
        ],
        units: 'km'
      })
    })

    if (!orsResponse.ok) {
      const errorText = await orsResponse.text()
      console.error('OpenRouteService error:', errorText)
      throw new Error(`OpenRouteService API error: ${orsResponse.status}`)
    }

    const data = await orsResponse.json()
    
    // Extraction des données de la route
    const route = data.routes?.[0]
    if (!route) {
      throw new Error('No route found')
    }

    const summary = route.summary
    const distance = summary.distance // déjà en km
    const duration = summary.duration // en secondes

    const response: CalculateDistanceResponse = {
      distance: Math.round(distance * 100) / 100, // Arrondi à 2 décimales
      duration: Math.round(duration),
      route: route.geometry // GeoJSON de la route
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error calculating distance:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
