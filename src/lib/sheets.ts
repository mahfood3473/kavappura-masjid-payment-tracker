// Google Apps Script backend client
// All operations use GET to avoid POST redirect issues with Apps Script

const SCRIPT_URL = process.env.APPS_SCRIPT_URL!;

async function scriptGet(action: string) {
  const url = `${SCRIPT_URL}?action=${action}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Apps Script GET failed: ${res.status}`);
  return res.json();
}

async function scriptWrite(action: string, data: any) {
  // Send write operations via GET with payload param to avoid POST 302 redirect issue
  const payload = encodeURIComponent(JSON.stringify({ action, data }));
  const url = `${SCRIPT_URL}?action=write&payload=${payload}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Apps Script write failed: ${res.status}`);
  const result = await res.json();
  if (result.success === false) throw new Error(result.error || 'Write failed');
  return result;
}

// ─── Members ───────────────────────────────────────────────────

export interface MemberRow {
  id: string;
  name: string;
  houseNumber: string;
  phone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export async function getAllMembers(): Promise<MemberRow[]> {
  return scriptGet('getMembers');
}

export async function addMember(member: MemberRow): Promise<void> {
  await scriptWrite('addMember', member);
}

export async function updateMember(member: MemberRow): Promise<void> {
  await scriptWrite('updateMember', member);
}

export async function deleteMember(id: string): Promise<void> {
  await scriptWrite('deleteMember', { id });
}

// ─── Payments ──────────────────────────────────────────────────

export interface PaymentRow {
  id: string;
  memberId: string;
  amount: number;
  month: number;
  year: number;
  paidDate: string;
  note: string;
}

export async function getAllPayments(): Promise<PaymentRow[]> {
  return scriptGet('getPayments');
}

export async function addPayment(payment: PaymentRow): Promise<void> {
  await scriptWrite('addPayment', payment);
}

export async function addPaymentsBulk(payments: PaymentRow[]): Promise<void> {
  await scriptWrite('addPaymentsBulk', payments);
}

export async function deletePayment(id: string): Promise<void> {
  await scriptWrite('deletePayment', { id });
}
