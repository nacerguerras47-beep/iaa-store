export async function sendTelegramNotification(order: any): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram not configured — skipping notification')
    return
  }

  const deliveryEmoji = order.delivery_type === 'domicile' ? '🏠' : '🏢'
  const deliveryLabel = order.delivery_type === 'domicile' ? 'Livraison à domicile' : 'Livraison au bureau'

  const message = [
    `🛒 *NOUVELLE COMMANDE — Diaa Store*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🔑 *N° Commande:* \`${order.order_number}\``,
    `📅 *Date:* ${new Date(order.created_at).toLocaleString('fr-FR')}`,
    ``,
    `📦 *Produit:* ${escMd(order.product_name)}${order.variant_name ? ' — ' + escMd(order.variant_name) : ''}`,
    `🔢 *Quantité:* ${order.quantity}`,
    `💰 *Prix unitaire:* ${Number(order.unit_price).toLocaleString('fr-FR')} DA`,
    `🚚 *Livraison:* ${Number(order.delivery_price).toLocaleString('fr-FR')} DA`,
    `💵 *Total:* *${Number(order.total_price).toLocaleString('fr-FR')} DA*`,
    ``,
    `👤 *Client:* ${escMd(order.last_name)} ${escMd(order.first_name)}`,
    `📞 *Téléphone:* \`${order.phone}\``,
    `📍 *Wilaya:* ${escMd(order.wilaya)}`,
    `🏙️ *Commune:* ${escMd(order.commune)}`,
    `🏡 *Adresse:* ${escMd(order.address)}`,
    `${deliveryEmoji} *Type:* ${deliveryLabel}`,
    ``,
    `💳 *Paiement:* COD \\(à la livraison\\)`,
    `━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n')

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'MarkdownV2',
      }),
    })
    if (!resp.ok) {
      const err = await resp.text()
      console.error('Telegram API error:', err)
    }
  } catch (err) {
    console.error('Telegram fetch error:', err)
  }
}

export async function sendBulkTelegramNotification(orders: any[], totalDelivery?: number): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId   = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('Telegram not configured — skipping notification')
    return
  }

  const first = orders[0]
  const deliveryEmoji = first.delivery_type === 'domicile' ? '🏠' : '🏢'
  const deliveryLabel = first.delivery_type === 'domicile' ? 'Livraison à domicile' : 'Livraison au bureau'
  const orderNumbers = orders.map(o => `\`${o.order_number}\``).join(', ')
  const totalDeliverySum = orders.reduce((s, o) => s + Number(o.delivery_price), 0)
  const totalAll = orders.reduce((s, o) => s + Number(o.total_price), 0)
  const displayDelivery = totalDelivery ?? totalDeliverySum

  const productLines = orders.map((o, i) =>
    `  ${i + 1}\\. ${escMd(o.product_name)}${o.variant_name ? ' — ' + escMd(o.variant_name) : ''} × ${o.quantity} — ${Number(o.total_price - o.delivery_price).toLocaleString('fr-FR')} DA`
  ).join('\n')

  const message = [
    `🛒 *NOUVELLE COMMANDE — Diaa Store*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📦 *Produits:*`,
    productLines,
    `🚚 *Livraison:* ${displayDelivery.toLocaleString('fr-FR')} DA`,
    `💵 *Total:* *${totalAll.toLocaleString('fr-FR')} DA*`,
    ``,
    `👤 *Client:* ${escMd(first.last_name)} ${escMd(first.first_name)}`,
    `📞 *Téléphone:* \`${first.phone}\``,
    `📍 *Wilaya:* ${escMd(first.wilaya)}`,
    `🏙️ *Commune:* ${escMd(first.commune)}`,
    `🏡 *Adresse:* ${escMd(first.address)}`,
    `${deliveryEmoji} *Type:* ${deliveryLabel}`,
    ``,
    `📋 *N° Commandes:* ${orderNumbers}`,
    `💳 *Paiement:* COD \\(à la livraison\\)`,
    `━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n')

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'MarkdownV2',
      }),
    })
    if (!resp.ok) {
      const err = await resp.text()
      console.error('Telegram API error:', err)
    }
  } catch (err) {
    console.error('Telegram fetch error:', err)
  }
}

// Escape special chars for MarkdownV2
function escMd(text: string): string {
  if (!text) return ''
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}
