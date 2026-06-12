import { google } from 'googleapis'

export async function appendOrderToSheet(order: any): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!spreadsheetId || !credentials) {
    console.warn('Google Sheets not configured — skipping')
    return
  }

  let parsedCreds
  try {
    parsedCreds = JSON.parse(credentials)
  } catch {
    console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON')
    return
  }

  const auth = new google.auth.GoogleAuth({
    credentials: parsedCreds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  const deliveryLabel = order.delivery_type === 'domicile' ? 'Domicile' : 'Bureau'

  // Columns: Nombre | N° Commande | Produit | Quantité | Prix | Nom | Prénom | Téléphone | Wilaya | Commune | Adresse | Livraison | Date | Statut
  const row = [
    '',                                                         // Nombre (filled by admin)
    order.order_number || order.id?.slice(0, 8).toUpperCase(), // N° Commande
    order.product_name,                                         // Produit
    order.quantity,                                             // Quantité
    order.total_price,                                          // Prix
    order.last_name,                                            // Nom
    order.first_name,                                           // Prénom
    order.phone,                                                // Téléphone
    order.wilaya,                                               // Wilaya
    order.commune,                                              // Commune
    order.address,                                              // Adresse
    deliveryLabel,                                              // Livraison type
    new Date(order.created_at).toLocaleString('fr-FR'),         // Date
    'En attente',                                               // Statut
  ]

  try {
    // Ensure headers exist on first use
    await ensureHeaders(sheets, spreadsheetId)

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Commandes!A:N',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    })

    // Apply sort by column A (Nombre) ascending — only non-empty Nombre rows
    await sortByNombre(sheets, spreadsheetId)
  } catch (err) {
    console.error('Google Sheets append error:', err)
  }
}

async function ensureHeaders(sheets: any, spreadsheetId: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Commandes!A1:N1',
  })
  if (!res.data.values || res.data.values.length === 0) {
    const headers = [
      'Nombre', 'N° Commande', 'Produit', 'Quantité', 'Prix (DA)',
      'Nom', 'Prénom', 'Téléphone', 'Wilaya', 'Commune',
      'Adresse', 'Livraison', 'Date', 'Statut'
    ]
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Commandes!A1:N1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    })
    // Bold + freeze header row
    const sheetId = await getSheetId(sheets, spreadsheetId, 'Commandes')
    if (sheetId !== null) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.059, green: 0.137, blue: 0.290 } } },
                fields: 'userEnteredFormat(textFormat,backgroundColor)',
              },
            },
            { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
          ],
        },
      })
    }
  }
}

async function getSheetId(sheets: any, spreadsheetId: string, sheetName: string): Promise<number | null> {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId })
    const sheet = meta.data.sheets?.find((s: any) => s.properties?.title === sheetName)
    return sheet?.properties?.sheetId ?? null
  } catch {
    return null
  }
}

async function sortByNombre(sheets: any, spreadsheetId: string) {
  try {
    const sheetId = await getSheetId(sheets, spreadsheetId, 'Commandes')
    if (sheetId === null) return

    // Get all data to find last row
    const dataRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Commandes!A:A' })
    const rowCount = dataRes.data.values?.length || 2
    if (rowCount <= 2) return

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          sortRange: {
            range: {
              sheetId,
              startRowIndex: 1,           // skip header
              endRowIndex: rowCount,
              startColumnIndex: 0,
              endColumnIndex: 14,
            },
            sortSpecs: [{
              dimensionIndex: 0,          // column A = Nombre
              sortOrder: 'ASCENDING',
            }],
          },
        }],
      },
    })
  } catch (err) {
    console.error('Sort error:', err)
  }
}
