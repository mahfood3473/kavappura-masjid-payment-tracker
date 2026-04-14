'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Member, Payment, MONTHS, getCurrentMonthYear, getMonthName, DEFAULT_AMOUNT } from '@/lib/types';
import { fetchMembers, fetchPayments, createPayment, createPaymentsBulk, removePayment } from '@/lib/api';

export default function PaymentsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const [viewYear, setViewYear] = useState(currentYear);

  // Form state
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(currentMonth);
  const [paymentYear, setPaymentYear] = useState(currentYear);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [note, setNote] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkMemberIds, setBulkMemberIds] = useState<Set<string>>(new Set());

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

  const resetForm = () => {
    setSelectedMemberId('');
    setPaymentMonth(currentMonth);
    setPaymentYear(currentYear);
    setAmount(DEFAULT_AMOUNT);
    setNote('');
    setBulkMode(false);
    setBulkMemberIds(new Set());
    setShowForm(false);
  };

  const hasPaidAlready = (memberId: string, m: number, y: number) =>
    payments.some((p) => p.memberId === memberId && p.month === m && p.year === y);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      if (bulkMode) {
        const newPayments: Payment[] = [];
        bulkMemberIds.forEach((memberId) => {
          if (!hasPaidAlready(memberId, paymentMonth, paymentYear)) {
            newPayments.push({
              id: uuidv4(),
              memberId,
              amount,
              month: paymentMonth,
              year: paymentYear,
              paidDate: new Date().toISOString(),
              note: note.trim(),
            });
          }
        });
        if (newPayments.length > 0) {
          await createPaymentsBulk(newPayments);
        }
      } else {
        if (!selectedMemberId) return;
        if (hasPaidAlready(selectedMemberId, paymentMonth, paymentYear)) {
          alert('Payment already recorded for this member in this month!');
          setSaving(false);
          return;
        }
        await createPayment({
          id: uuidv4(),
          memberId: selectedMemberId,
          amount,
          month: paymentMonth,
          year: paymentYear,
          paidDate: new Date().toISOString(),
          note: note.trim(),
        });
      }
      resetForm();
      await loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Delete this payment record?')) return;
    try {
      setSaving(true);
      await removePayment(id);
      await loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleBulkMember = (id: string) => {
    const newSet = new Set(bulkMemberIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setBulkMemberIds(newSet);
  };

  const activeMembers = members.filter((m) => m.active);
  const viewPayments = payments.filter((p) => p.month === viewMonth && p.year === viewYear);
  const paidMemberIds = new Set(viewPayments.map((p) => p.memberId));
  const unpaidMembers = activeMembers.filter((m) => !paidMemberIds.has(m.id));
  const paidMembers = activeMembers.filter((m) => paidMemberIds.has(m.id));

  const navigateMonth = (direction: number) => {
    const d = new Date(viewYear, viewMonth - 1 + direction, 1);
    setViewMonth(d.getMonth() + 1);
    setViewYear(d.getFullYear());
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading payments...</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">Record and manage monthly payments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary text-sm">Refresh</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">+ Record Payment</button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="card flex items-center justify-between mb-6">
        <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h2 className="text-lg font-semibold">{getMonthName(viewMonth)} {viewYear}</h2>
          <p className="text-sm text-gray-500">{paidMembers.length} paid / {unpaidMembers.length} unpaid</p>
        </div>
        <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600" />
          Saving to Google Sheets...
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={bulkMode} onChange={(e) => setBulkMode(e.target.checked)} className="rounded" />
                Bulk Mode
              </label>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select value={paymentMonth} onChange={(e) => setPaymentMonth(Number(e.target.value))} className="input">
                    {MONTHS.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select value={paymentYear} onChange={(e) => setPaymentYear(Number(e.target.value))} className="input">
                    {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
              </div>

              {bulkMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Members ({bulkMemberIds.size} selected)
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                    {activeMembers.map((m) => {
                      const alreadyPaid = hasPaidAlready(m.id, paymentMonth, paymentYear);
                      return (
                        <label key={m.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${alreadyPaid ? 'opacity-50' : ''}`}>
                          <input type="checkbox" checked={bulkMemberIds.has(m.id)} onChange={() => toggleBulkMember(m.id)} disabled={alreadyPaid} className="rounded" />
                          <span className="text-sm">{m.name} #{m.houseNumber}</span>
                          {alreadyPaid && <span className="badge-paid ml-auto">Paid</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member *</label>
                  <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} className="input" required>
                    <option value="">Select a member</option>
                    {activeMembers.map((m) => (<option key={m.id} value={m.id}>{m.name} - #{m.houseNumber}</option>))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input" min="0" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Optional note" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving || (bulkMode ? bulkMemberIds.size === 0 : !selectedMemberId)}>
                  {saving ? 'Saving...' : bulkMode ? `Record ${bulkMemberIds.size} Payment(s)` : 'Record Payment'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary" disabled={saving}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Paid ({paidMembers.length})
          </h3>
          {paidMembers.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-sm">No payments yet</div>
          ) : (
            <div className="space-y-2">
              {paidMembers.map((m) => {
                const payment = viewPayments.find((p) => p.memberId === m.id)!;
                return (
                  <div key={m.id} className="card py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        #{m.houseNumber} &middot; {payment.amount.toLocaleString()}
                        {payment.note && ` &middot; ${payment.note}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-paid">Paid</span>
                      <button onClick={() => handleDeletePayment(payment.id)} className="text-gray-400 hover:text-red-500" disabled={saving} title="Delete payment">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Unpaid ({unpaidMembers.length})
          </h3>
          {unpaidMembers.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-sm">All members have paid!</div>
          ) : (
            <div className="space-y-2">
              {unpaidMembers.map((m) => (
                <div key={m.id} className="card py-3 px-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-gray-500">#{m.houseNumber}</p>
                  </div>
                  <span className="badge-unpaid">Unpaid</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Total collected in {getMonthName(viewMonth)} {viewYear}</span>
          <span className="text-lg font-bold text-primary-700">
            {viewPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
