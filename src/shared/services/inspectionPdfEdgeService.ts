import { supabase } from '../../lib/supabase'

export async function triggerServerPdf(inspectionId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const { data, error } = await supabase.rpc('regenerate_inspection_pdf', {
      p_inspection_id: inspectionId,
    })

    if (error) throw error

    return { success: true }
  } catch (e: any) {
    console.error('triggerServerPdf error', e)
    return { success: false, message: e.message }
  }
}

export async function getCachedPdfUrl(inspectionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('inspection_pdfs')
    .select('pdf_url, generated_at')
    .eq('inspection_id', inspectionId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('getCachedPdfUrl error', error)
    return null
  }
  return data?.pdf_url ?? null
}

export async function generateAndWaitPdf(inspectionId: string, timeoutMs = 15000): Promise<{ success: boolean; pdfUrl?: string; message?: string }> {
  const trigger = await triggerServerPdf(inspectionId)
  if (!trigger.success) return { success: false, message: trigger.message || 'Failed to trigger PDF generation' }

  // Poll cache for up to timeoutMs
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const url = await getCachedPdfUrl(inspectionId)
    if (url) return { success: true, pdfUrl: url }
    await new Promise((r) => setTimeout(r, 1200))
  }
  return { success: false, message: 'Timeout waiting for PDF generation' }
}
