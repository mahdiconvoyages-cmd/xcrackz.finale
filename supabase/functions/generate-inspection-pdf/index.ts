import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InspectionData {
  id: string
  inspection_type: string
  overall_condition: string
  mileage_km: number
  fuel_level: number
  client_name: string
  client_signature: string
  driver_name: string
  driver_signature: string
  created_at: string
  missions: {
    reference: string
    vehicle_brand: string
    vehicle_model: string
    vehicle_plate: string
    pickup_address: string
    delivery_address: string
  }
  photos: Array<{
    photo_type: string
    full_url: string
  }>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { inspectionId } = await req.json()

    if (!inspectionId) {
      throw new Error('inspectionId is required')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Fetch inspection data with photos
    const { data: inspection, error: inspectionError } = await supabaseClient
      .from('vehicle_inspections')
      .select(`
        *,
        missions (
          reference,
          vehicle_brand,
          vehicle_model,
          vehicle_plate,
          pickup_address,
          delivery_address
        )
      `)
      .eq('id', inspectionId)
      .single()

    if (inspectionError) throw inspectionError
    if (!inspection) throw new Error('Inspection not found')

    // Fetch photos from v2 table
    const { data: photos, error: photosError } = await supabaseClient
      .from('inspection_photos_v2')
      .select('photo_type, full_url')
      .eq('inspection_id', inspectionId)
      .order('taken_at', { ascending: true })

    if (photosError) throw photosError

    inspection.photos = photos || []

    // Generate PDF
    const pdfBytes = await generatePDF(inspection as InspectionData)

    // Upload to storage
    const fileName = `${inspectionId}_${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('inspection-pdfs')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('inspection-pdfs')
      .getPublicUrl(fileName)

    // Save to inspection_pdfs table
    const { error: cacheError } = await supabaseClient
      .from('inspection_pdfs')
      .upsert({
        inspection_id: inspectionId,
        pdf_url: publicUrl,
        file_size_bytes: pdfBytes.length,
        page_count: 1,
        version: 1,
      }, {
        onConflict: 'inspection_id,version'
      })

    if (cacheError) throw cacheError

    // Update inspection record
    await supabaseClient
      .from('vehicle_inspections')
      .update({
        pdf_generated: true,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq('id', inspectionId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf_url: publicUrl,
        file_size: pdfBytes.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

async function generatePDF(inspection: InspectionData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()
  let yPosition = height - 50

  // Header
  page.drawText('RAPPORT D\'INSPECTION', {
    x: 50,
    y: yPosition,
    size: 24,
    font: helveticaBold,
    color: rgb(0.2, 0.4, 0.6),
  })
  yPosition -= 40

  // Mission info
  page.drawText(`Mission: ${inspection.missions.reference}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
  })
  yPosition -= 20

  page.drawText(`Véhicule: ${inspection.missions.vehicle_brand} ${inspection.missions.vehicle_model}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
  })
  yPosition -= 20

  page.drawText(`Immatriculation: ${inspection.missions.vehicle_plate}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
  })
  yPosition -= 30

  // Type d'inspection
  page.drawText(`Type: ${inspection.inspection_type === 'departure' ? 'DÉPART' : 'ARRIVÉE'}`, {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBold,
  })
  yPosition -= 30

  // Details
  page.drawText(`État général: ${inspection.overall_condition}`, {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaFont,
  })
  yPosition -= 18

  if (inspection.mileage_km) {
    page.drawText(`Kilométrage: ${inspection.mileage_km.toLocaleString('fr-FR')} km`, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaFont,
    })
    yPosition -= 18
  }

  if (inspection.fuel_level) {
    page.drawText(`Niveau carburant: ${inspection.fuel_level}%`, {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaFont,
    })
    yPosition -= 30
  }

  // Signatures
  page.drawText('SIGNATURES', {
    x: 50,
    y: yPosition,
    size: 14,
    font: helveticaBold,
  })
  yPosition -= 25

  const sigWidth = 150
  const sigHeight = 75
  const sigSpacing = 20

  try {
    // Client signature
    if (inspection.client_signature) {
      const clientSigBytes = await fetch(inspection.client_signature).then(r => r.arrayBuffer())
      const clientSigImage = await pdfDoc.embedPng(clientSigBytes)
      
      page.drawText('Client', { x: 50, y: yPosition + sigHeight + 5, size: 10, font: helveticaBold })
      page.drawImage(clientSigImage, {
        x: 50,
        y: yPosition,
        width: sigWidth,
        height: sigHeight,
      })
      page.drawText(inspection.client_name || '', { x: 50, y: yPosition - 15, size: 9, font: helveticaFont })
    }

    // Driver signature
    if (inspection.driver_signature) {
      const driverSigBytes = await fetch(inspection.driver_signature).then(r => r.arrayBuffer())
      const driverSigImage = await pdfDoc.embedPng(driverSigBytes)
      
      const driverX = 50 + sigWidth + sigSpacing
      page.drawText('Convoyeur', { x: driverX, y: yPosition + sigHeight + 5, size: 10, font: helveticaBold })
      page.drawImage(driverSigImage, {
        x: driverX,
        y: yPosition,
        width: sigWidth,
        height: sigHeight,
      })
      page.drawText(inspection.driver_name || '', { x: driverX, y: yPosition - 15, size: 9, font: helveticaFont })
    }
  } catch (sigError) {
    console.error('Error embedding signatures:', sigError)
  }

  yPosition -= (sigHeight + 40)

  // Photos section
  if (inspection.photos && inspection.photos.length > 0) {
    // Add new page for photos if needed
    if (yPosition < 200) {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
    }

    page.drawText('PHOTOS', {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
    })
    yPosition -= 30

    const photoWidth = 240
    const photoHeight = 180
    const photosPerRow = 2
    let photoX = 50
    let photoCount = 0

    for (const photo of inspection.photos.slice(0, 8)) { // Max 8 photos
      try {
        const photoBytes = await fetch(photo.full_url).then(r => r.arrayBuffer())
        const photoImage = await pdfDoc.embedJpg(photoBytes)

        if (yPosition < photoHeight + 50) {
          page = pdfDoc.addPage([595, 842])
          yPosition = height - 50
          photoX = 50
          photoCount = 0
        }

        page.drawImage(photoImage, {
          x: photoX,
          y: yPosition - photoHeight,
          width: photoWidth,
          height: photoHeight,
        })

        page.drawText(photo.photo_type, {
          x: photoX,
          y: yPosition - photoHeight - 15,
          size: 8,
          font: helveticaFont,
        })

        photoCount++
        if (photoCount % photosPerRow === 0) {
          yPosition -= photoHeight + 30
          photoX = 50
        } else {
          photoX += photoWidth + 15
        }
      } catch (photoError) {
        console.error(`Error embedding photo ${photo.photo_type}:`, photoError)
      }
    }
  }

  return await pdfDoc.save()
}
