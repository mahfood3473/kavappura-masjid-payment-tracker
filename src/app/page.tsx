'use client';

import { useEffect, useState, useCallback } from 'react';
import { Member, Payment, getCurrentMonthYear, getMonthName, formatMonthYear, getPreviousMonths } from '@/lib/types';
import { fetchMembers, fetchPayments } from '@/lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [m, p] = await Promise.all([fetchMembers(), fetchPayments()]);
      setMembers(m);
      setPayments(p);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading from Google Sheets...</p>
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

  const { month, year } = getCurrentMonthYear();
  const activeMembers = members.filter((m) => m.active);
  const currentMonthPayments = payments.filter((p) => p.month === month && p.year === year);
  const paidMemberIds = new Set(currentMonthPayments.map((p) => p.memberId));
  const paidThisMonth = activeMembers.filter((m) => paidMemberIds.has(m.id));
  const unpaidThisMonth = activeMembers.filter((m) => !paidMemberIds.has(m.id));

  // Last month
  const prevMonths = getPreviousMonths(1);
  const lastMonth = prevMonths[0];
  const lastMonthPayments = payments.filter((p) => p.month === lastMonth.month && p.year === lastMonth.year);
  const lastMonthPaidIds = new Set(lastMonthPayments.map((p) => p.memberId));
  const paidLastMonth = activeMembers.filter((m) => lastMonthPaidIds.has(m.id));
  const unpaidLastMonth = activeMembers.filter((m) => !lastMonthPaidIds.has(m.id));

  // Overdue (unpaid for last 2-3 months)
  const prev3 = getPreviousMonths(3);
  const overdue2Months: Member[] = [];
  const overdue3Months: Member[] = [];
  for (const m of activeMembers) {
    let missedCount = 0;
    for (const pm of prev3) {
      if (!payments.some((p) => p.memberId === m.id && p.month === pm.month && p.year === pm.year)) {
        missedCount++;
      }
    }
    if (missedCount >= 3) overdue3Months.push(m);
    else if (missedCount >= 2) overdue2Months.push(m);
  }

  // Advance paid (next 2-3 months)
  const now = new Date();
  const next2 = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  const next3 = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const advancePaid2: Member[] = [];
  const advancePaid3: Member[] = [];
  for (const m of activeMembers) {
    const hasPaid2 = payments.some(
      (p) => p.memberId === m.id && p.month === next2.getMonth() + 1 && p.year === next2.getFullYear()
    );
    const hasPaid3 = payments.some(
      (p) => p.memberId === m.id && p.month === next3.getMonth() + 1 && p.year === next3.getFullYear()
    );
    if (hasPaid3) advancePaid3.push(m);
    else if (hasPaid2) advancePaid2.push(m);
  }

  const totalCollectedThisMonth = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            {getMonthName(month)} {year} &mdash; Payment Overview
          </p>
        </div>
        <button onClick={loadData} className="btn-secondary text-sm" title="Refresh data">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Total Members</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{activeMembers.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Paid This Month</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{paidThisMonth.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Unpaid This Month</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{unpaidThisMonth.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Collected This Month</p>
          <p className="text-3xl font-bold text-primary-700 mt-1">{totalCollectedThisMonth.toLocaleString()}</p>
        </div>
      </div>

      {/* Current Month Status */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Paid This Month</h2>
            <span className="badge-paid">{paidThisMonth.length}</span>
          </div>
          {paidThisMonth.length === 0 ? (
            <p className="text-gray-400 text-sm">No payments recorded yet</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {paidThisMonth.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-400">#{m.houseNumber}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Unpaid This Month</h2>
            <span className="badge-unpaid">{unpaidThisMonth.length}</span>
          </div>
          {unpaidThisMonth.length === 0 ? (
            <p className="text-gray-400 text-sm">All members have paid!</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {unpaidThisMonth.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-medium">{m.name}</span>
                  <span className="text-gray-400">#{m.houseNumber}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Last Month */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Paid Last Month</h2>
            <span className="text-xs text-gray-400">{formatMonthYear(lastMonth.month, lastMonth.year)}</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{paidLastMonth.length}</p>
          <p className="text-sm text-gray-500 mt-1">of {activeMembers.length} members</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Unpaid Last Month</h2>
            <span className="text-xs text-gray-400">{formatMonthYear(lastMonth.month, lastMonth.year)}</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{unpaidLastMonth.length}</p>
          <p className="text-sm text-gray-500 mt-1">of {activeMembers.length} members</p>
        </div>
      </div>

      {/* Overdue & Advance */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card border-l-4 border-l-orange-500">
          <h2 className="font-semibold text-gray-900 mb-3">Overdue Payments</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Missed 2 months</p>
              {overdue2Months.length === 0 ? (
                <p className="text-gray-400 text-xs">None</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {overdue2Months.map((m) => (
                    <li key={m.id} className="text-sm">
                      <span className="badge-overdue">{m.name} #{m.houseNumber}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Missed 3+ months</p>
              {overdue3Months.length === 0 ? (
                <p className="text-gray-400 text-xs">None</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {overdue3Months.map((m) => (
                    <li key={m.id} className="text-sm">
                      <span className="badge-unpaid">{m.name} #{m.houseNumber}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="card border-l-4 border-l-blue-500">
          <h2 className="font-semibold text-gray-900 mb-3">Advance Payments</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Paid 2 months ahead</p>
              {advancePaid2.length === 0 ? (
                <p className="text-gray-400 text-xs">None</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {advancePaid2.map((m) => (
                    <li key={m.id} className="text-sm">
                      <span className="badge-advance">{m.name} #{m.houseNumber}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid 3 months ahead</p>
              {advancePaid3.length === 0 ? (
                <p className="text-gray-400 text-xs">None</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {advancePaid3.map((m) => (
                    <li key={m.id} className="text-sm">
                      <span className="badge-advance">{m.name} #{m.houseNumber}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/members" className="btn-primary">+ Add Member</Link>
        <Link href="/payments" className="btn-primary">Record Payment</Link>
        <Link href="/reports" className="btn-secondary">View Reports</Link>
      </div>
    </div>
  );
}
