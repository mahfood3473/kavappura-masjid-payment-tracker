// ============================================================
// Kavappura Masjid Payment Tracker - Google Apps Script
// ============================================================
// SETUP:
// 1. Create a Google Sheet with 2 tabs: "Members" and "Payments"
// 2. Open Extensions > Apps Script
// 3. Paste this entire code and click Save
// 4. Click Deploy > New deployment > Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Copy the Web App URL and add to Vercel env as APPS_SCRIPT_URL
// ============================================================

const SHEET = SpreadsheetApp.getActiveSpreadsheet();

function getOrCreateSheet(name, headers) {
  let sheet = SHEET.getSheetByName(name);
  if (!sheet) {
    sheet = SHEET.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

const MEMBER_HEADERS = ['id', 'name', 'houseNumber', 'phone', 'address', 'active', 'createdAt'];
const PAYMENT_HEADERS = ['id', 'memberId', 'amount', 'month', 'year', 'paidDate', 'note'];

// ─── READ helpers ─────────────────────────────────────────────

function getAllMembers() {
  const sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    obj.active = obj.active !== false && obj.active !== 'false';
    obj.amount = Number(obj.amount) || 0;
    obj.month = Number(obj.month) || 0;
    obj.year = Number(obj.year) || 0;
    return obj;
  });
}

function getAllPayments() {
  const sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    obj.amount = Number(obj.amount) || 0;
    obj.month = Number(obj.month) || 0;
    obj.year = Number(obj.year) || 0;
    return obj;
  });
}

// ─── WRITE helpers ────────────────────────────────────────────

function addMember(data) {
  const sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  sheet.appendRow(MEMBER_HEADERS.map(h => data[h] !== undefined ? data[h] : ''));
}

function updateMember(data) {
  const sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      const newRow = MEMBER_HEADERS.map(h => data[h] !== undefined ? data[h] : '');
      sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      return true;
    }
  }
  return false;
}

function deleteMember(id) {
  const sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  // Also delete payments for this member
  deletePaymentsForMember(id);
}

function addPayment(data) {
  const sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  sheet.appendRow(PAYMENT_HEADERS.map(h => data[h] !== undefined ? data[h] : ''));
}

function deletePayment(id) {
  const sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function deletePaymentsForMember(memberId) {
  const sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][1] === memberId) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ─── Web App handlers ─────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action;
  let result;

  switch (action) {
    case 'getMembers':
      result = getAllMembers();
      break;
    case 'getPayments':
      result = getAllPayments();
      break;
    case 'getAll':
      result = { members: getAllMembers(), payments: getAllPayments() };
      break;
    default:
      result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;
  let result = { success: true };

  try {
    switch (action) {
      case 'addMember':
        addMember(body.data);
        break;
      case 'updateMember':
        updateMember(body.data);
        break;
      case 'deleteMember':
        deleteMember(body.data.id);
        break;
      case 'addPayment':
        addPayment(body.data);
        break;
      case 'addPaymentsBulk':
        body.data.forEach(p => addPayment(p));
        result.count = body.data.length;
        break;
      case 'deletePayment':
        deletePayment(body.data.id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
