import { google } from 'googleapis';

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID!;

// ─── Generic helpers ───────────────────────────────────────────────

async function getRows(sheetName: string): Promise<string[][]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
  return (res.data.values || []) as string[][];
}

async function appendRow(sheetName: string, row: string[]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

async function updateRow(sheetName: string, rowIndex: number, row: string[]): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

async function deleteRow(sheetName: string, rowIndex: number): Promise<void> {
  const sheets = getSheets();
  // Get sheetId first
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // 0-based
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

// ─── Members ───────────────────────────────────────────────────────
// Columns: id | name | houseNumber | phone | address | active | createdAt

export interface MemberRow {
  id: string;
  name: string;
  houseNumber: string;
  phone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

function rowToMember(row: string[]): MemberRow {
  return {
    id: row[0] || '',
    name: row[1] || '',
    houseNumber: row[2] || '',
    phone: row[3] || '',
    address: row[4] || '',
    active: row[5] !== 'false',
    createdAt: row[6] || '',
  };
}

function memberToRow(m: MemberRow): string[] {
  return [m.id, m.name, m.houseNumber, m.phone, m.address, String(m.active), m.createdAt];
}

export async function getAllMembers(): Promise<MemberRow[]> {
  const rows = await getRows('Members');
  // Skip header row
  return rows.slice(1).map(rowToMember);
}

export async function addMember(member: MemberRow): Promise<void> {
  await appendRow('Members', memberToRow(member));
}

export async function updateMember(member: MemberRow): Promise<void> {
  const rows = await getRows('Members');
  const idx = rows.findIndex((r) => r[0] === member.id);
  if (idx < 0) throw new Error('Member not found');
  await updateRow('Members', idx + 1, memberToRow(member));
}

export async function deleteMember(id: string): Promise<void> {
  const rows = await getRows('Members');
  const idx = rows.findIndex((r) => r[0] === id);
  if (idx < 0) throw new Error('Member not found');
  await deleteRow('Members', idx + 1);
  // Also delete all payments for this member
  await deletePaymentsForMember(id);
}

// ─── Payments ──────────────────────────────────────────────────────
// Columns: id | memberId | amount | month | year | paidDate | note

export interface PaymentRow {
  id: string;
  memberId: string;
  amount: number;
  month: number;
  year: number;
  paidDate: string;
  note: string;
}

function rowToPayment(row: string[]): PaymentRow {
  return {
    id: row[0] || '',
    memberId: row[1] || '',
    amount: Number(row[2]) || 0,
    month: Number(row[3]) || 0,
    year: Number(row[4]) || 0,
    paidDate: row[5] || '',
    note: row[6] || '',
  };
}

function paymentToRow(p: PaymentRow): string[] {
  return [p.id, p.memberId, String(p.amount), String(p.month), String(p.year), p.paidDate, p.note];
}

export async function getAllPayments(): Promise<PaymentRow[]> {
  const rows = await getRows('Payments');
  return rows.slice(1).map(rowToPayment);
}

export async function addPayment(payment: PaymentRow): Promise<void> {
  await appendRow('Payments', paymentToRow(payment));
}

export async function deletePayment(id: string): Promise<void> {
  const rows = await getRows('Payments');
  const idx = rows.findIndex((r) => r[0] === id);
  if (idx < 0) throw new Error('Payment not found');
  await deleteRow('Payments', idx + 1);
}

async function deletePaymentsForMember(memberId: string): Promise<void> {
  // Delete in reverse order to keep indices stable
  const rows = await getRows('Payments');
  const indicesToDelete: number[] = [];
  rows.forEach((r, i) => {
    if (i > 0 && r[1] === memberId) indicesToDelete.push(i + 1);
  });
  for (let i = indicesToDelete.length - 1; i >= 0; i--) {
    await deleteRow('Payments', indicesToDelete[i]);
  }
}

export async function hasPayment(memberId: string, month: number, year: number): Promise<boolean> {
  const payments = await getAllPayments();
  return payments.some(
    (p) => p.memberId === memberId && p.month === month && p.year === year
  );
}

// ─── Initialize sheet headers ──────────────────────────────────────

export async function initializeSheetHeaders(): Promise<void> {
  const sheets = getSheets();

  // Check if Members sheet has headers
  const membersRows = await getRows('Members');
  if (membersRows.length === 0) {
    await appendRow('Members', ['id', 'name', 'houseNumber', 'phone', 'address', 'active', 'createdAt']);
  }

  // Check if Payments sheet has headers
  try {
    const paymentsRows = await getRows('Payments');
    if (paymentsRows.length === 0) {
      await appendRow('Payments', ['id', 'memberId', 'amount', 'month', 'year', 'paidDate', 'note']);
    }
  } catch {
    // Payments sheet might not exist yet - create it
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const exists = meta.data.sheets?.some((s) => s.properties?.title === 'Payments');
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: 'Payments' } } }],
        },
      });
      await appendRow('Payments', ['id', 'memberId', 'amount', 'month', 'year', 'paidDate', 'note']);
    }
  }
}
