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
    `📦 *Produit:* ${escMd(order.product_name)}`,
    `🔢 *Quantité:* ${order.quantity}`,
    `💰 *Prix unitaire:* ${Number(order.unit_price).toLocaleString()} DA`,
    `🚚 *Livraison:* ${Number(order.delivery_price).toLocaleString()} DA`,
    `💵 *Total:* *${Number(order.total_price).toLocaleString()} DA*`,
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

// Escape special chars for MarkdownV2
function escMd(text: string): string {
  if (!text) return ''
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&')
}
