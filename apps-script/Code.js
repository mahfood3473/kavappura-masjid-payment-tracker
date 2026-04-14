// ============================================================
// Kavappura Masjid Payment Tracker - Google Apps Script
// ============================================================

var SHEET = SpreadsheetApp.getActiveSpreadsheet();

var MEMBER_HEADERS = ['id', 'name', 'houseNumber', 'phone', 'address', 'active', 'createdAt'];
var PAYMENT_HEADERS = ['id', 'memberId', 'amount', 'month', 'year', 'paidDate', 'note'];

function getOrCreateSheet(name, headers) {
  var sheet = SHEET.getSheetByName(name);
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

// ─── READ helpers ─────────────────────────────────────────────

function getAllMembers() {
  var sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0];
  return rows.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    obj.active = obj.active !== false && obj.active !== 'false';
    return obj;
  });
}

function getAllPayments() {
  var sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  var headers = rows[0];
  return rows.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    obj.amount = Number(obj.amount) || 0;
    obj.month = Number(obj.month) || 0;
    obj.year = Number(obj.year) || 0;
    return obj;
  });
}

// ─── WRITE helpers ────────────────────────────────────────────

function addMember(data) {
  var sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  sheet.appendRow(MEMBER_HEADERS.map(function(h) { return data[h] !== undefined ? data[h] : ''; }));
}

function updateMember(data) {
  var sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      var newRow = MEMBER_HEADERS.map(function(h) { return data[h] !== undefined ? data[h] : ''; });
      sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
      return true;
    }
  }
  return false;
}

function deleteMember(id) {
  var sheet = getOrCreateSheet('Members', MEMBER_HEADERS);
  var rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  deletePaymentsForMember(id);
}

function addPayment(data) {
  var sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  sheet.appendRow(PAYMENT_HEADERS.map(function(h) { return data[h] !== undefined ? data[h] : ''; }));
}

function deletePayment(id) {
  var sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  var rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function deletePaymentsForMember(memberId) {
  var sheet = getOrCreateSheet('Payments', PAYMENT_HEADERS);
  var rows = sheet.getDataRange().getValues();
  for (var i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]) === String(memberId)) {
      sheet.deleteRow(i + 1);
    }
  }
}

// ─── Execute a write action ───────────────────────────────────

function executeWrite(action, data) {
  var result = { success: true };
  try {
    switch (action) {
      case 'addMember':
        addMember(data);
        break;
      case 'updateMember':
        updateMember(data);
        break;
      case 'deleteMember':
        deleteMember(data.id);
        break;
      case 'addPayment':
        addPayment(data);
        break;
      case 'addPaymentsBulk':
        data.forEach(function(p) { addPayment(p); });
        result.count = data.length;
        break;
      case 'deletePayment':
        deletePayment(data.id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }
  return result;
}

// ─── Web App: all via GET to avoid POST redirect issues ───────

function doGet(e) {
  var action = e.parameter.action;
  var result;

  // Read actions
  if (action === 'getMembers') {
    result = getAllMembers();
  } else if (action === 'getPayments') {
    result = getAllPayments();
  } else if (action === 'getAll') {
    result = { members: getAllMembers(), payments: getAllPayments() };
  } else if (action === 'write') {
    // Write actions: payload is JSON-encoded in the 'payload' parameter
    var body = JSON.parse(e.parameter.payload);
    result = executeWrite(body.action, body.data);
  } else {
    result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var result = executeWrite(body.action, body.data);

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
