export async function appendOrderToSheet(order: any): Promise<void> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL
  console.log('[GoogleSheets] GOOGLE_APPS_SCRIPT_URL:', url ? url.substring(0, 50) + '...' : 'MISSING')
  console.log('[GoogleSheets] Data sent:', JSON.stringify(order))
  if (!url) {
    console.warn('GOOGLE_APPS_SCRIPT_URL not configured — skipping')
    return
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    })
    const text = await res.text()
    console.log('[GoogleSheets] Response:', text)
  } catch (err) {
    console.error('[GoogleSheets] Fetch error:', err)
    throw err
  }
}

export async function appendBulkOrdersToSheet(orders: any[]): Promise<void> {
  for (const order of orders) {
    await appendOrderToSheet(order)
  }
}

export async function updateOrderPriceInSheet(
  orderNumber: string,
  totalPrice: number,
  netPrice: number,
): Promise<void> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL
  if (!url) {
    console.warn('GOOGLE_APPS_SCRIPT_URL not configured — skipping')
    return
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updatePrice', order_number: orderNumber, total_price: totalPrice, net_price: netPrice }),
    })
    const text = await res.text()
    console.log('Google Sheets price update response:', text)
  } catch (err) {
    console.error('Google Sheets price update error:', err)
  }
}

export async function updateOrderNombreInSheet(
  orderNumber: string,
  nombre: number | null,
): Promise<void> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL
  if (!url) {
    console.warn('GOOGLE_APPS_SCRIPT_URL not configured — skipping')
    return
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateNombre', order_number: orderNumber, nombre }),
    })
    const text = await res.text()
    console.log('Google Sheets update response:', text)
  } catch (err) {
    console.error('Google Sheets update error:', err)
  }
}