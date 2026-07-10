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
      data.product_name || '',                                  // F=6: Product
      data.delivery_type === 'domicile' ? 'A domicile' : 'Au bureau', // G=7: Delivery
      '',   // H=8: Livre checkbox
      'En attente',  // I=9: Situation
      '',   // J=10: Nombre (NB)
      '',   // K=11: Expédie checkbox
      '',   // L=12: Livre checkbox
      '',   // M=13: Paiement
      data.quantity || 0,  // N=14: Psc (quantity)
      data.total_price || 0,  // O=15: Total
      (Number(data.total_price) || 0) - (Number(data.delivery_price) || 0), // P=16: Net = total - delivery
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
      sheet.getRange(rowIndex, 16).setValue(data.net_price)    // P=16: Net
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
  ScriptApp.newTrigger('sortByNombre')
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
