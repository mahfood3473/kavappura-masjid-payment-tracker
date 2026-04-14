export interface Member {
  id: string;
  name: string;
  houseNumber: string;
  phone: string;
  address: string;
  active: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  month: number;
  year: number;
  paidDate: string;
  note: string;
}

export interface MonthYear {
  month: number;
  year: number;
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const DEFAULT_AMOUNT = 100;

export function getMonthName(month: number): string {
  return MONTHS[month - 1] || '';
}

export function formatMonthYear(month: number, year: number): string {
  return `${getMonthName(month)} ${year}`;
}

export function getCurrentMonthYear(): MonthYear {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function getPreviousMonths(count: number): MonthYear[] {
  const result: MonthYear[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return result;
}

export function getNextMonths(count: number): MonthYear[] {
  const result: MonthYear[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push({ month: d.getMonth() + 1, year: d.getFullYear() });
  }
  return result;
}
