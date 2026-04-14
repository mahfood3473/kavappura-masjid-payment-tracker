import { Member, Payment } from './types';

const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Members
export async function fetchMembers(): Promise<Member[]> {
  return request<Member[]>('/api/members');
}

export async function createMember(member: Member): Promise<void> {
  await request('/api/members', { method: 'POST', body: JSON.stringify(member) });
}

export async function updateMember(member: Member): Promise<void> {
  await request('/api/members', { method: 'PUT', body: JSON.stringify(member) });
}

export async function removeMember(id: string): Promise<void> {
  await request('/api/members', { method: 'DELETE', body: JSON.stringify({ id }) });
}

// Payments
export async function fetchPayments(): Promise<Payment[]> {
  return request<Payment[]>('/api/payments');
}

export async function createPayment(payment: Payment): Promise<void> {
  await request('/api/payments', { method: 'POST', body: JSON.stringify(payment) });
}

export async function createPaymentsBulk(payments: Payment[]): Promise<void> {
  await request('/api/payments', { method: 'POST', body: JSON.stringify(payments) });
}

export async function removePayment(id: string): Promise<void> {
  await request('/api/payments', { method: 'DELETE', body: JSON.stringify({ id }) });
}
