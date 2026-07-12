var WEBHOOK_URL = 'https://diaa-store.vercel.app/api/webhook/sheets'
var WEBHOOK_SECRET = 'db2431fe9399448a9bcddb81d26b3b6ba3badbfdf5ea69c1'

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)

    if (data.action === 'updatePrice') {
      return handleUpdatePrice(data)
    }

    if (data.action === 'updateNombre') {
      return handleUpdateNombre(data)
    }

    if (data.action === 'updateStatus') {
      return handleUpdateStatus(data)
    }

    if (data.action) {
      return ContentService.createTextOutput(JSON.stringify({error: 'Unknown action: ' + data.action}))
        .setMimeType(ContentService.MimeType.JSON)
    }

    // --- no action → append new order row ---
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Commandes')

    const row = [
      new Date(data.created_at).toLocaleString('fr-FR'),  // A=1: Date
      (data.last_name || '') + ' ' + (data.first_name || ''), // B=2: Full name
      data.phone || '',                                        // C=3: Phone
      data.commune || '',                                      // D=4: Commune
      data.wilaya || '',                                       // E=5: Wilaya
      (data.product_name || '') + (data.variant_name ? ' — ' + data.variant_name : ''), // F=6: Product + variant
      data.delivery_type === 'domicile' ? 'A domicile' : 'Au bureau', // G=7: Delivery
      '',   // H=8: Livre checkbox
      'En attente',  // I=9: Situation
      '',   // J=10: Nombre (NB)
      '',   // K=11: Expédie checkbox
      '',   // L=12: Livre checkbox
      '',   // M=13: Paiement
      data.quantity || 0,  // N=14: Psc (quantity)
      data.total_price || 0,  // O=15: Total
      data.unit_price || 0,  // P=16: Net = unit_price (single product price)
      '',   // Q=17: Agence
      data.order_number || '',  // R=18: N° Code
    ]

    const lastRow = sheet.getLastRow()
    let targetRow = null
    for (let i = 2; i <= lastRow; i++) {
      if (!sheet.getRange(i, 1).getValue()) {
        targetRow = i
        break
      }
    }
    if (!targetRow) targetRow = lastRow + 1

    sheet.getRange(targetRow, 1, 1, row.length).setValues([row])

    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON)
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON)
  }
}

function handleUpdatePrice(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Commandes')
  const lastRow = sheet.getLastRow()
  const orderNumbers = sheet.getRange(2, 18, lastRow - 1).getValues() // Column R (18)

  for (let i = 0; i < orderNumbers.length; i++) {
    if (String(orderNumbers[i][0]).trim() === String(data.order_number).trim()) {
      const rowIndex = i + 2
      sheet.getRange(rowIndex, 15).setValue(data.total_price)  // O=15: Total
      sheet.getRange(rowIndex, 16).setValue(data.net_price)    // P=16: Net = unit_price
      return ContentService.createTextOutput(JSON.stringify({success: true, row: rowIndex}))
        .setMimeType(ContentService.MimeType.JSON)
    }
  }

  return ContentService.createTextOutput(JSON.stringify({error: 'Order number not found in column R'}))
    .setMimeType(ContentService.MimeType.JSON)
}

function handleUpdateNombre(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Commandes')
  const lastRow = sheet.getLastRow()
  const orderNumbers = sheet.getRange(2, 18, lastRow - 1).getValues() // Column R (18)

  for (let i = 0; i < orderNumbers.length; i++) {
    if (String(orderNumbers[i][0]).trim() === String(data.order_number).trim()) {
      const rowIndex = i + 2
      sheet.getRange(rowIndex, 10).setValue(data.nombre) // J=10: Nombre
      return ContentService.createTextOutput(JSON.stringify({success: true, row: rowIndex}))
        .setMimeType(ContentService.MimeType.JSON)
    }
  }

  return ContentService.createTextOutput(JSON.stringify({error: 'Order number not found in column R'}))
    .setMimeType(ContentService.MimeType.JSON)
}

function handleUpdateStatus(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Commandes')
  const lastRow = sheet.getLastRow()
  const orderNumbers = sheet.getRange(2, 18, lastRow - 1).getValues() // Column R (18)

  for (let i = 0; i < orderNumbers.length; i++) {
    if (String(orderNumbers[i][0]).trim() === String(data.order_number).trim()) {
      const rowIndex = i + 2
      sheet.getRange(rowIndex, 9).setValue(data.situation)  // I=9: Situation
      return ContentService.createTextOutput(JSON.stringify({success: true, row: rowIndex}))
        .setMimeType(ContentService.MimeType.JSON)
    }
  }

  return ContentService.createTextOutput(JSON.stringify({error: 'Order number not found in column R'}))
    .setMimeType(ContentService.MimeType.JSON)
}

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t) })

  ScriptApp.newTrigger('sortByNombre')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create()

  ScriptApp.newTrigger('syncToAdmin')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create()
}

function sortByNombre(e) {
  const sheet = e.source.getActiveSheet()
  if (sheet.getName() !== 'Commandes') return

  const editedColumn = e.range.getColumn()
  if (editedColumn !== 10) return // J=10: Nombre

  const lastRow = sheet.getLastRow()
  if (lastRow <= 2) return

  const range = sheet.getRange(2, 1, lastRow - 1, 18) // 18 columns A-R
  const values = range.getValues()

  const withNumber = values.filter(r => r[9] !== '' && r[9] !== null)
  const withoutNumber = values.filter(r => r[9] === '' || r[9] === null)

  withNumber.sort((a, b) => Number(a[9]) - Number(b[9]))

  range.setValues([...withNumber, ...withoutNumber])
}

function syncToAdmin(e) {
  Logger.log('syncToAdmin: col=' + e.range.getColumn() + ' row=' + e.range.getRow() + ' value=' + e.value + ' old=' + e.oldValue)

  var sheet = e.source.getActiveSheet()
  if (sheet.getName() !== 'Commandes') { Logger.log('Wrong sheet: ' + sheet.getName()); return }

  var COLUMN_MAP = {
    9:  'situation',
    10: 'nombre',
    11: 'is_expedie',
    12: 'is_livre',
    13: 'paiement',
    15: 'total_price',
    16: 'net_price',
  }

  var col = e.range.getColumn()
  var field = COLUMN_MAP[col]
  if (!field) { Logger.log('Column ' + col + ' not in map'); return }

  if (e.oldValue !== undefined && e.oldValue === e.value) { Logger.log('Same value, skipping'); return }

  var row = e.range.getRow()
  if (row < 2) { Logger.log('Header row, skipping'); return }

  var orderNumber = sheet.getRange(row, 18).getValue()
  Logger.log('orderNumber=' + orderNumber)
  if (!orderNumber) { Logger.log('No order number, skipping'); return }

  var value = e.value
  if (value === undefined || value === null) { Logger.log('No value, skipping'); return }
  if (value === '') { Logger.log('Empty value, skipping'); return }

  if (col === 10 || col === 15 || col === 16) {
    value = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value)
  }
  if (isNaN(value)) { Logger.log('NaN value, skipping'); return }

  Logger.log('Sending: field=' + field + ' value=' + value + ' order=' + String(orderNumber).trim())

  var payload = {
    secret: WEBHOOK_SECRET,
    order_number: String(orderNumber).trim(),
    field: field,
    value: value,
  }

  try {
    var resp = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    })
    Logger.log('Webhook response: ' + resp.getContentText())
    var respData = JSON.parse(resp.getContentText())
    // When total_price changed, webhook returns new unit_price — update Net column P
    if (field === 'total_price' && respData.unit_price !== undefined) {
      sheet.getRange(row, 16).setValue(respData.unit_price)
      Logger.log('Updated Net (col 16) to ' + respData.unit_price)
    }
  } catch(err) {
    Logger.log('Webhook error: ' + err.message)
  }
}
