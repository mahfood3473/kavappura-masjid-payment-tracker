'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Member, Payment, MONTHS, getCurrentMonthYear, getPreviousMonths, getNextMonths } from '@/lib/types';
import { fetchMembers, fetchPayments } from '@/lib/api';

type FilterType = 'all' | 'paid_current' | 'unpaid_current' | 'paid_last' | 'unpaid_last' | 'overdue_2' | 'overdue_3' | 'advance_2' | 'advance_3';

const FILTERS: { value: FilterType; label: string; color: string }[] = [
  { value: 'all', label: 'All Members', color: 'bg-gray-100 text-gray-800' },
  { value: 'paid_current', label: 'Paid This Month', color: 'bg-green-100 text-green-800' },
  { value: 'unpaid_current', label: 'Unpaid This Month', color: 'bg-red-100 text-red-800' },
  { value: 'paid_last', label: 'Paid Last Month', color: 'bg-green-50 text-green-700' },
  { value: 'unpaid_last', label: 'Unpaid Last Month', color: 'bg-red-50 text-red-700' },
  { value: 'overdue_2', label: 'Overdue 2 Months', color: 'bg-orange-100 text-orange-800' },
  { value: 'overdue_3', label: 'Overdue 3+ Months', color: 'bg-red-200 text-red-900' },
  { value: 'advance_2', label: 'Paid 2 Months Ahead', color: 'bg-blue-100 text-blue-800' },
  { value: 'advance_3', label: 'Paid 3 Months Ahead', color: 'bg-indigo-100 text-indigo-800' },
];

export default function ReportsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedYear, setSelectedYear] = useState(getCurrentMonthYear().year);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [m, p] = await Promise.all([fetchMembers(), fetchPayments()]);
      setMembers(m);
      setPayments(p);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const activeMembers = members.filter((m) => m.active);
  const prevMonths = getPreviousMonths(3);
  const nextMonths = getNextMonths(3);

  const filteredMembers = useMemo(() => {
    if (filter === 'all') return activeMembers;

    return activeMembers.filter((m) => {
      const hasPaidMonth = (month: number, year: number) =>
        payments.some((p) => p.memberId === m.id && p.month === month && p.year === year);

      switch (filter) {
        case 'paid_current':
          return hasPaidMonth(currentMonth, currentYear);
        case 'unpaid_current':
          return !hasPaidMonth(currentMonth, currentYear);
        case 'paid_last':
          return prevMonths[0] && hasPaidMonth(prevMonths[0].month, prevMonths[0].year);
        case 'unpaid_last':
          return prevMonths[0] && !hasPaidMonth(prevMonths[0].month, prevMonths[0].year);
        case 'overdue_2': {
          let missed = 0;
          for (const pm of prevMonths.slice(0, 2)) {
            if (!hasPaidMonth(pm.month, pm.year)) missed++;
          }
          return missed >= 2;
        }
        case 'overdue_3': {
          let missed = 0;
          for (const pm of prevMonths) {
            if (!hasPaidMonth(pm.month, pm.year)) missed++;
          }
          return missed >= 3;
        }
        case 'advance_2':
          return nextMonths[1] && hasPaidMonth(nextMonths[1].month, nextMonths[1].year);
        case 'advance_3':
          return nextMonths[2] && hasPaidMonth(nextMonths[2].month, nextMonths[2].year);
        default:
          return true;
      }
    });
  }, [filter, activeMembers, payments, currentMonth, currentYear, prevMonths, nextMonths]);

  const yearlySummary = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthPayments = payments.filter((p) => p.month === month && p.year === selectedYear);
      const paidCount = new Set(monthPayments.map((p) => p.memberId)).size;
      const totalAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      return { month, name: MONTHS[i], paidCount, unpaidCount: activeMembers.length - paidCount, totalAmount };
    });
  }, [payments, selectedYear, activeMembers.length]);

  const years = useMemo(() => {
    const paymentYears = payments.map((p) => p.year).filter((y) => y > 0);
    const allYears = new Set([...paymentYears, currentYear]);
    // Always include from 2020 to current year + 1 so all years are selectable
    for (let y = 2020; y <= currentYear + 1; y++) {
      allYears.add(y);
    }
    return Array.from(allYears).sort((a, b) => a - b);
  }, [payments, currentYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 font-medium mb-2">Failed to load data</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={loadData} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Detailed payment reports and member status</p>
        </div>
        <button onClick={loadData} className="btn-secondary text-sm">Refresh</button>
      </div>

      {/* Filter Chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f.value
                ? `${f.color} ring-2 ring-offset-1 ring-primary-500`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtered Results */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {FILTERS.find((f) => f.value === filter)?.label} ({filteredMembers.length})
          </h2>
        </div>

        {filteredMembers.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">No members match this filter</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">#</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Name</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">House</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Phone</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">This Month</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">Last Month</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMembers.map((m, index) => {
                  const paidCurrent = payments.some(
                    (p) => p.memberId === m.id && p.month === currentMonth && p.year === currentYear
                  );
                  const paidLast = prevMonths[0] && payments.some(
                    (p) => p.memberId === m.id && p.month === prevMonths[0].month && p.year === prevMonths[0].year
                  );
                  let overdueCount = 0;
                  for (const pm of prevMonths) {
                    if (!payments.some((p) => p.memberId === m.id && p.month === pm.month && p.year === pm.year)) {
                      overdueCount++;
                    }
                  }

                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400">{index + 1}</td>
                      <td className="py-2 px-3 font-medium">{m.name}</td>
                      <td className="py-2 px-3 text-gray-600">#{m.houseNumber}</td>
                      <td className="py-2 px-3 text-gray-600">{m.phone || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        {paidCurrent ? <span className="badge-paid">Paid</span> : <span className="badge-unpaid">Unpaid</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {paidLast ? <span className="badge-paid">Paid</span> : <span className="badge-unpaid">Unpaid</span>}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {overdueCount === 0 ? (
                          <span className="text-green-600 text-xs">Clear</span>
                        ) : (
                          <span className="badge-overdue">{overdueCount} month{overdueCount > 1 ? 's' : ''}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yearly Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Yearly Summary</h2>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="input w-auto">
            {years.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-500">Month</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Paid</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Unpaid</th>
                <th className="text-right py-2 px-3 font-medium text-gray-500">Collected</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yearlySummary.map((row) => {
                const percentage = activeMembers.length > 0 ? Math.round((row.paidCount / activeMembers.length) * 100) : 0;
                return (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{row.name}</td>
                    <td className="py-2 px-3 text-center text-green-600">{row.paidCount}</td>
                    <td className="py-2 px-3 text-center text-red-600">{row.unpaidCount}</td>
                    <td className="py-2 px-3 text-right font-medium">{row.totalAmount.toLocaleString()}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300">
                <td className="py-2 px-3 font-bold">Total</td>
                <td className="py-2 px-3 text-center font-bold text-green-600">{yearlySummary.reduce((s, r) => s + r.paidCount, 0)}</td>
                <td className="py-2 px-3 text-center font-bold text-red-600">{yearlySummary.reduce((s, r) => s + r.unpaidCount, 0)}</td>
                <td className="py-2 px-3 text-right font-bold">{yearlySummary.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
