import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabase'
import { withAdminAuth } from '../../../lib/adminAuth'

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { base64, filename, contentType } = req.body

  if (!base64 || !filename) {
    return res.status(400).json({ error: 'base64 et filename sont requis' })
  }

  // Strip data-url prefix if present
  const raw = base64.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(raw, 'base64')

  const ext       = filename.split('.').pop()?.toLowerCase() || 'jpg'
  const uniqueName = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const mime       = contentType || `image/${ext === 'jpg' ? 'jpeg' : ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(uniqueName, buffer, {
      contentType:  mime,
      cacheControl: '3600',
      upsert:       false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return res.status(500).json({ error: uploadError.message })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('product-images')
    .getPublicUrl(uniqueName)

  return res.status(201).json({ url: urlData.publicUrl })
}

export default withAdminAuth(handler)
