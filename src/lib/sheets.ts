// Google Apps Script backend client
// The Apps Script URL is set in Vercel env as APPS_SCRIPT_URL

const SCRIPT_URL = process.env.APPS_SCRIPT_URL!;

async function scriptGet(action: string) {
  const url = `${SCRIPT_URL}?action=${action}`;
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' });
  if (!res.ok) throw new Error(`Apps Script GET failed: ${res.status}`);
  return res.json();
}

async function scriptPost(action: string, data: any) {
  const payload = JSON.stringify({ action, data });

  // Google Apps Script returns a 302 redirect on POST.
  // fetch() follows it but converts POST→GET and drops the body.
  // So we disable redirect, grab the Location header, and re-POST to it.
  const initial = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    redirect: 'manual',
  });

  if (initial.status === 302 || initial.status === 301) {
    const redirectUrl = initial.headers.get('location');
    if (!redirectUrl) throw new Error('Apps Script redirect with no location');

    const res = await fetch(redirectUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    if (!res.ok) throw new Error(`Apps Script POST failed: ${res.status}`);
    return res.json();
  }

  if (!initial.ok) throw new Error(`Apps Script POST failed: ${initial.status}`);
  return initial.json();
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
  await scriptPost('addMember', member);
}

export async function updateMember(member: MemberRow): Promise<void> {
  await scriptPost('updateMember', member);
}

export async function deleteMember(id: string): Promise<void> {
  await scriptPost('deleteMember', { id });
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
  await scriptPost('addPayment', payment);
}

export async function addPaymentsBulk(payments: PaymentRow[]): Promise<void> {
  await scriptPost('addPaymentsBulk', payments);
}

export async function deletePayment(id: string): Promise<void> {
  await scriptPost('deletePayment', { id });
}
