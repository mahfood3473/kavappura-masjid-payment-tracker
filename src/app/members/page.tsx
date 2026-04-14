'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '@/lib/types';
import { fetchMembers, createMember, updateMember, removeMember } from '@/lib/api';

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchMembers();
      setMembers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setName('');
    setHouseNumber('');
    setPhone('');
    setAddress('');
    setEditingMember(null);
    setShowForm(false);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setName(member.name);
    setHouseNumber(member.houseNumber);
    setPhone(member.phone);
    setAddress(member.address);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !houseNumber.trim()) return;

    const member: Member = {
      id: editingMember?.id || uuidv4(),
      name: name.trim(),
      houseNumber: houseNumber.trim(),
      phone: phone.trim(),
      address: address.trim(),
      active: true,
      createdAt: editingMember?.createdAt || new Date().toISOString(),
    };

    try {
      setSaving(true);
      if (editingMember) {
        await updateMember(member);
      } else {
        await createMember(member);
      }
      resetForm();
      await loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will also delete all payment records for this member.')) return;
    try {
      setSaving(true);
      await removeMember(id);
      await loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (member: Member) => {
    try {
      setSaving(true);
      await updateMember({ ...member, active: !member.active });
      await loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.houseNumber.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Loading members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600 font-medium mb-2">Failed to load members</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button onClick={loadData} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-500 mt-1">Manage homes and families</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary text-sm">Refresh</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            + Add Member
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, house number, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-md"
        />
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold">
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Full name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">House Number *</label>
                <input type="text" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} className="input" placeholder="e.g. 101" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input" placeholder="Full address" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingMember ? 'Update' : 'Add Member'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary" disabled={saving}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members List */}
      {saving && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600" />
          Saving to Google Sheets...
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="text-gray-500">
            {members.length === 0 ? 'No members yet. Add your first member!' : 'No members match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((member) => (
            <div
              key={member.id}
              className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${!member.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {member.name}
                    {!member.active && <span className="ml-2 text-xs text-gray-400">(Inactive)</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    House #{member.houseNumber}
                    {member.phone && ` | ${member.phone}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 ml-13 sm:ml-0">
                <button onClick={() => handleEdit(member)} className="text-sm text-primary-600 hover:text-primary-800 font-medium" disabled={saving}>Edit</button>
                <button onClick={() => handleToggleActive(member)} className="text-sm text-gray-500 hover:text-gray-700 font-medium" disabled={saving}>
                  {member.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleDelete(member.id)} className="text-sm text-red-500 hover:text-red-700 font-medium" disabled={saving}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400">
        Total: {members.length} members ({members.filter((m) => m.active).length} active)
      </div>
    </div>
  );
}
