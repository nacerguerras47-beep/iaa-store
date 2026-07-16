import crypto from 'crypto'

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '')
  if (cleaned.startsWith('+213')) return cleaned
  if (cleaned.startsWith('213')) return '+' + cleaned
  if (cleaned.startsWith('0')) return '+213' + cleaned.slice(1)
  return '+213' + cleaned
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function fbclidToFbc(fbclid: string, capturedAtMs: number): string {
  return `fb.1.${capturedAtMs}.${fbclid}`
}

export async function sendPurchaseEvent(params: {
  order_number: string
  phone: string
  total: number
  product_name: string
  fbclid?: string | null
  fbclid_captured_at?: number | null
  client_ip_address?: string | null
  client_user_agent?: string | null
}): Promise<void> {
  const datasetId = process.env.META_DATASET_ID
  const accessToken = process.env.META_CONVERSIONS_API_TOKEN

  if (!datasetId || !accessToken) {
    console.warn('[MetaCAPI] META_DATASET_ID or META_CONVERSIONS_API_TOKEN not configured — skipping')
    return
  }

  const normalizedPhone = normalizePhone(params.phone)
  const hashedPhone = sha256(normalizedPhone)
  const eventTime = Math.floor(Date.now() / 1000)

  const userData: Record<string, any> = {
    ph: [hashedPhone],
  }

  if (params.fbclid && params.fbclid_captured_at) {
    userData.fbc = fbclidToFbc(params.fbclid, params.fbclid_captured_at)
  }

  if (params.client_ip_address) {
    userData.client_ip_address = params.client_ip_address
  }

  if (params.client_user_agent) {
    userData.client_user_agent = params.client_user_agent
  }

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: eventTime,
        action_source: 'other',
        event_id: params.order_number,
        user_data: userData,
        custom_data: {
          currency: 'DZD',
          value: params.total,
          content_name: params.product_name,
        },
      },
    ],
  }

  const url = `https://graph.facebook.com/v19.0/${datasetId}/events?access_token=${accessToken}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (!res.ok) {
      console.error('[MetaCAPI] Error response:', JSON.stringify(body))
    } else {
      console.log('[MetaCAPI] Purchase event sent:', JSON.stringify(body))
    }
  } catch (err) {
    console.error('[MetaCAPI] Fetch error:', err)
  }
}
