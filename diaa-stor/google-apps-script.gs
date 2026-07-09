function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)

    // --- updatePrice: find row by order_number in column P, update M & N ---
    if (data.action === 'updatePrice') {
      return handleUpdatePrice(data)
    }

    // --- updateNombre: find row by order_number in column P, update H ---
    if (data.action === 'updateNombre') {
      return handleUpdateNombre(data)
    }

    // --- default: append new order row ---
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Commandes')

    const row = [
      new Date(data.created_at).toLocaleString('fr-FR'),  // A
      data.last_name + ' ' + data.first_name,              // B
      data.phone,                                           // C
      data.wilaya + ' / ' + data.commune,                   // D
      data.product_name,                                    // E
      data.delivery_type === 'domicile' ? 'A domicile' : 'Au bureau', // F
      'En attente',                                          // G
      '',  // H Nombre
      '',  // I Expédié
      '',  // J Livré
      '',  // K Paiement
      data.quantity,        // L Psc
      data.total_price,     // M Total
      data.unit_price,      // N net
      '',   // O Agence
      data.order_number || ''  // P Numéro commande
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
  const orderNumbers = sheet.getRange(2, 16, lastRow - 1).getValues() // Column P (16)

  for (let i = 0; i < orderNumbers.length; i++) {
    if (String(orderNumbers[i][0]).trim() === String(data.order_number).trim()) {
      const rowIndex = i + 2
      // Column M (13) = total_price, Column N (14) = net (total_price - delivery_price)
      sheet.getRange(rowIndex, 13).setValue(data.total_price)
      sheet.getRange(rowIndex, 14).setValue(data.net_price)
      return ContentService.createTextOutput(JSON.stringify({success: true, row: rowIndex}))
        .setMimeType(ContentService.MimeType.JSON)
    }
  }

  return ContentService.createTextOutput(JSON.stringify({error: 'Order number not found in column P'}))
    .setMimeType(ContentService.MimeType.JSON)
}

function handleUpdateNombre(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Commandes')
  const lastRow = sheet.getLastRow()
  const orderNumbers = sheet.getRange(2, 16, lastRow - 1).getValues() // Column P (16)

  for (let i = 0; i < orderNumbers.length; i++) {
    if (String(orderNumbers[i][0]).trim() === String(data.order_number).trim()) {
      const rowIndex = i + 2
      sheet.getRange(rowIndex, 8).setValue(data.nombre) // Column H (8)
      return ContentService.createTextOutput(JSON.stringify({success: true, row: rowIndex}))
        .setMimeType(ContentService.MimeType.JSON)
    }
  }

  return ContentService.createTextOutput(JSON.stringify({error: 'Order number not found in column P'}))
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
  if (editedColumn !== 8) return // العمود H = Nombre

  const lastRow = sheet.getLastRow()
  if (lastRow <= 2) return

  const range = sheet.getRange(2, 1, lastRow - 1, 16) // 16 columns A-P
  const values = range.getValues()

  const withNumber = values.filter(r => r[7] !== '' && r[7] !== null)
  const withoutNumber = values.filter(r => r[7] === '' || r[7] === null)

  withNumber.sort((a, b) => Number(a[7]) - Number(b[7]))

  range.setValues([...withNumber, ...withoutNumber])
}
