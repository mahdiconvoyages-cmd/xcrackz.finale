import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

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
  scannedDocuments?: Array<{
    document_type: string
    document_title: string
    document_url: string
    pages_count: number
  }>
  expenses?: Array<{
    expense_type: string
    amount: number
    description: string
    receipt_url: string | null
  }>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier le secret interne pour les appels depuis la DB
    const internalSecret = req.headers.get('X-Internal-Secret')
    const expectedSecret = Deno.env.get('PDF_INTERNAL_SECRET')
    
    if (expectedSecret && internalSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const requestBody = await req.json()
    const { inspectionId, missionId, departureId, arrivalId, combined } = requestBody

    // Create Supabase client with service role for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Mode combiné (départ + arrivée)
    if (combined && missionId && departureId && arrivalId) {
      return await generateCombinedPDF(supabaseClient, missionId, departureId, arrivalId)
    }

    // Mode simple (1 seule inspection) - legacy
    if (!inspectionId) {
      throw new Error('inspectionId or (missionId + departureId + arrivalId) required')
    }

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

    // Fetch scanned documents
    const { data: documents, error: documentsError } = await supabaseClient
      .from('inspection_documents')
      .select('document_type, document_title, document_url, pages_count')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true })

    if (documentsError) console.error('Documents error:', documentsError)

    // Fetch expenses
    const { data: expenses, error: expensesError } = await supabaseClient
      .from('inspection_expenses')
      .select('expense_type, amount, description, receipt_url')
      .eq('inspection_id', inspectionId)
      .order('created_at', { ascending: true })

    if (expensesError) console.error('Expenses error:', expensesError)

    inspection.scannedDocuments = documents || []
    inspection.expenses = expenses || []

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

  // Documents scannés section
  if (inspection.scannedDocuments && inspection.scannedDocuments.length > 0) {
    // Add new page if needed
    if (yPosition < 150) {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
    }

    yPosition -= 20
    page.drawText('DOCUMENTS ANNEXES', {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: rgb(0.2, 0.4, 0.6),
    })
    yPosition -= 25

    for (const doc of inspection.scannedDocuments) {
      if (yPosition < 40) {
        page = pdfDoc.addPage([595, 842])
        yPosition = height - 50
      }

      page.drawText(`• ${doc.document_title}`, {
        x: 60,
        y: yPosition,
        size: 11,
        font: helveticaBold,
      })
      yPosition -= 15

      page.drawText(`  Type: ${doc.document_type} | Pages: ${doc.pages_count}`, {
        x: 70,
        y: yPosition,
        size: 9,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4),
      })
      yPosition -= 12

      page.drawText(`  URL: ${doc.document_url.substring(0, 80)}...`, {
        x: 70,
        y: yPosition,
        size: 8,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.7),
      })
      yPosition -= 20
    }
  }

  // Frais de mission section
  if (inspection.expenses && inspection.expenses.length > 0) {
    // Add new page if needed
    if (yPosition < 200) {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
    }

    yPosition -= 20
    page.drawText('FRAIS DE MISSION', {
      x: 50,
      y: yPosition,
      size: 14,
      font: helveticaBold,
      color: rgb(0.6, 0.2, 0.1),
    })
    yPosition -= 30

    // Table header
    page.drawRectangle({
      x: 50,
      y: yPosition - 18,
      width: 495,
      height: 20,
      color: rgb(0.9, 0.9, 0.9),
    })

    page.drawText('Type', { x: 60, y: yPosition - 13, size: 10, font: helveticaBold })
    page.drawText('Montant', { x: 200, y: yPosition - 13, size: 10, font: helveticaBold })
    page.drawText('Description', { x: 280, y: yPosition - 13, size: 10, font: helveticaBold })
    page.drawText('Reçu', { x: 480, y: yPosition - 13, size: 10, font: helveticaBold })
    yPosition -= 25

    let totalExpenses = 0

    for (const expense of inspection.expenses) {
      if (yPosition < 40) {
        page = pdfDoc.addPage([595, 842])
        yPosition = height - 50
      }

      totalExpenses += expense.amount

      // Type de frais
      const expenseTypeLabels: Record<string, string> = {
        carburant: 'Carburant',
        peage: 'Péage',
        transport: 'Transport',
        imprevu: 'Imprévu',
      }
      const typeLabel = expenseTypeLabels[expense.expense_type] || expense.expense_type

      page.drawText(typeLabel, { x: 60, y: yPosition, size: 9, font: helveticaFont })
      page.drawText(`${expense.amount.toFixed(2)} €`, { 
        x: 200, 
        y: yPosition, 
        size: 9, 
        font: helveticaFont 
      })

      // Description (truncate if too long)
      const description = expense.description.length > 25 
        ? expense.description.substring(0, 25) + '...' 
        : expense.description
      page.drawText(description, { x: 280, y: yPosition, size: 9, font: helveticaFont })

      // Reçu indicator
      page.drawText(expense.receipt_url ? '✓' : '-', { 
        x: 490, 
        y: yPosition, 
        size: 9, 
        font: helveticaFont,
        color: expense.receipt_url ? rgb(0.1, 0.6, 0.3) : rgb(0.5, 0.5, 0.5)
      })

      yPosition -= 18
    }

    // Total line
    yPosition -= 5
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 545, y: yPosition },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    })
    yPosition -= 20

    page.drawText('TOTAL:', { 
      x: 60, 
      y: yPosition, 
      size: 11, 
      font: helveticaBold 
    })
    page.drawText(`${totalExpenses.toFixed(2)} €`, { 
      x: 200, 
      y: yPosition, 
      size: 11, 
      font: helveticaBold,
      color: rgb(0.6, 0.2, 0.1)
    })
  }

  return await pdfDoc.save()
}

// Fonction pour générer un PDF combiné (départ + arrivée)
async function generateCombinedPDF(supabaseClient: any, missionId: string, departureId: string, arrivalId: string) {
  try {
    // Fetch both inspections
    const { data: departure, error: depError } = await supabaseClient
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
      .eq('id', departureId)
      .single()

    if (depError) throw new Error(`Départ: ${depError.message}`)

    const { data: arrival, error: arrError } = await supabaseClient
      .from('vehicle_inspections')
      .select('*')
      .eq('id', arrivalId)
      .single()

    if (arrError) throw new Error(`Arrivée: ${arrError.message}`)

    // Fetch photos for both
    const { data: depPhotos } = await supabaseClient
      .from('inspection_photos_v2')
      .select('photo_type, full_url')
      .eq('inspection_id', departureId)
      .order('taken_at', { ascending: true })

    const { data: arrPhotos } = await supabaseClient
      .from('inspection_photos_v2')
      .select('photo_type, full_url')
      .eq('inspection_id', arrivalId)
      .order('taken_at', { ascending: true })

    // Si pas de photos dans v2, essayer dans la vue
    let finalDepPhotos = depPhotos && depPhotos.length > 0 ? depPhotos : []
    let finalArrPhotos = arrPhotos && arrPhotos.length > 0 ? arrPhotos : []

    if (finalDepPhotos.length === 0) {
      const { data: depPhotosView } = await supabaseClient
        .from('inspection_photos')
        .select('photo_type, photo_url')
        .eq('inspection_id', departureId)
        .order('created_at', { ascending: true })
      finalDepPhotos = (depPhotosView || []).map((p: any) => ({ photo_type: p.photo_type, full_url: p.photo_url }))
    }

    if (finalArrPhotos.length === 0) {
      const { data: arrPhotosView } = await supabaseClient
        .from('inspection_photos')
        .select('photo_type, photo_url')
        .eq('inspection_id', arrivalId)
        .order('created_at', { ascending: true })
      finalArrPhotos = (arrPhotosView || []).map((p: any) => ({ photo_type: p.photo_type, full_url: p.photo_url }))
    }

    departure.photos = finalDepPhotos
    arrival.photos = finalArrPhotos

    // Fetch documents for both inspections
    const { data: depDocuments } = await supabaseClient
      .from('inspection_documents')
      .select('document_type, document_title, document_url, pages_count')
      .eq('inspection_id', departureId)
      .order('created_at', { ascending: true })

    const { data: arrDocuments } = await supabaseClient
      .from('inspection_documents')
      .select('document_type, document_title, document_url, pages_count')
      .eq('inspection_id', arrivalId)
      .order('created_at', { ascending: true })

    // Fetch expenses for both inspections
    const { data: depExpenses } = await supabaseClient
      .from('inspection_expenses')
      .select('expense_type, amount, description, receipt_url')
      .eq('inspection_id', departureId)
      .order('created_at', { ascending: true })

    const { data: arrExpenses } = await supabaseClient
      .from('inspection_expenses')
      .select('expense_type, amount, description, receipt_url')
      .eq('inspection_id', arrivalId)
      .order('created_at', { ascending: true })

    departure.scannedDocuments = depDocuments || []
    departure.expenses = depExpenses || []
    arrival.scannedDocuments = arrDocuments || []
    arrival.expenses = arrExpenses || []

    // Generate combined PDF
    const pdfBytes = await generateCombinedPDFDocument(departure as InspectionData, arrival as InspectionData)

    // Upload to storage
    const fileName = `mission_${missionId}_combined_${Date.now()}.pdf`
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

    // Save to inspection_pdfs table (avec mission_id)
    const { error: cacheError } = await supabaseClient
      .from('inspection_pdfs')
      .upsert({
        inspection_id: departureId, // On garde l'ID départ comme référence
        mission_id: missionId,
        pdf_url: publicUrl,
        file_size_bytes: pdfBytes.length,
        page_count: 2, // 2 pages minimum (1 départ + 1 arrivée)
        version: 1,
      }, {
        onConflict: 'inspection_id,version'
      })

    if (cacheError) console.error('Cache error:', cacheError)

    // Update both inspections
    await supabaseClient
      .from('vehicle_inspections')
      .update({
        pdf_generated: true,
        pdf_generated_at: new Date().toISOString(),
      })
      .in('id', [departureId, arrivalId])

    return new Response(
      JSON.stringify({ 
        success: true, 
        pdf_url: publicUrl,
        file_size: pdfBytes.length,
        combined: true 
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}

// Générer le document PDF combiné
async function generateCombinedPDFDocument(departure: InspectionData, arrival: InspectionData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Page 1: Inspection DÉPART
  let page = pdfDoc.addPage([595, 842]) // A4
  let { width, height } = page.getSize()
  let yPosition = height - 50

  // Header DÉPART
  page.drawText('RAPPORT D\'INSPECTION - DÉPART', {
    x: 50,
    y: yPosition,
    size: 22,
    font: helveticaBold,
    color: rgb(0.1, 0.6, 0.3),
  })
  yPosition -= 40

  // Mission info
  page.drawText(`Mission: ${departure.missions.reference}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
  })
  yPosition -= 20

  page.drawText(`Véhicule: ${departure.missions.vehicle_brand} ${departure.missions.vehicle_model} - ${departure.missions.vehicle_plate}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
  })
  yPosition -= 20

  page.drawText(`Kilométrage: ${departure.mileage_km} km | Carburant: ${departure.fuel_level}/8`, {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaFont,
  })
  yPosition -= 30

  page.drawText(`Photos DÉPART: ${departure.photos.length}`, {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaBold,
    color: rgb(0.1, 0.6, 0.3),
  })
  yPosition -= 20

  // Documents DÉPART
  if (departure.scannedDocuments && departure.scannedDocuments.length > 0) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
    }
    page.drawText(`Documents scannés: ${departure.scannedDocuments.length}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    yPosition -= 20
  }

  // Frais DÉPART
  if (departure.expenses && departure.expenses.length > 0) {
    if (yPosition < 80) {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
    }
    const totalDep = departure.expenses.reduce((sum, e) => sum + e.amount, 0)
    page.drawText(`Frais mission: ${totalDep.toFixed(2)} € (${departure.expenses.length} frais)`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.6, 0.2, 0.1),
    })
    yPosition -= 20
  }

  // Page 2: Inspection ARRIVÉE
  page = pdfDoc.addPage([595, 842])
  yPosition = height - 50

  page.drawText('RAPPORT D\'INSPECTION - ARRIVÉE', {
    x: 50,
    y: yPosition,
    size: 22,
    font: helveticaBold,
    color: rgb(0.6, 0.2, 0.1),
  })
  yPosition -= 40

  page.drawText(`Mission: ${departure.missions.reference}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
  })
  yPosition -= 20

  page.drawText(`Véhicule: ${departure.missions.vehicle_brand} ${departure.missions.vehicle_model} - ${departure.missions.vehicle_plate}`, {
    x: 50,
    y: yPosition,
    size: 12,
    font: helveticaFont,
  })
  yPosition -= 20

  page.drawText(`Kilométrage: ${arrival.mileage_km} km | Carburant: ${arrival.fuel_level}/8`, {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaFont,
  })
  yPosition -= 30

  page.drawText(`Photos ARRIVÉE: ${arrival.photos.length}`, {
    x: 50,
    y: yPosition,
    size: 11,
    font: helveticaBold,
    color: rgb(0.6, 0.2, 0.1),
  })
  yPosition -= 20

  // Documents ARRIVÉE
  if (arrival.scannedDocuments && arrival.scannedDocuments.length > 0) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
    }
    page.drawText(`Documents scannés: ${arrival.scannedDocuments.length}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    })
    yPosition -= 20
  }

  // Frais ARRIVÉE
  if (arrival.expenses && arrival.expenses.length > 0) {
    if (yPosition < 80) {
      page = pdfDoc.addPage([595, 842])
      yPosition = height - 50
    }
    const totalArr = arrival.expenses.reduce((sum, e) => sum + e.amount, 0)
    page.drawText(`Frais mission: ${totalArr.toFixed(2)} € (${arrival.expenses.length} frais)`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.6, 0.2, 0.1),
    })
    yPosition -= 20
  }

  return await pdfDoc.save()
}

