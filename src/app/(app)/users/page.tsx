'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-context';
import { getUsers, getInstitutions, updateUser, createUser } from '@/lib/store';
import { User, Role, ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/types';
import {
  Users, UserPlus, Search, Shield, Building2, Check, X,
  AlertTriangle, Eye, ShieldAlert, Key, Edit, Power
} from 'lucide-react';

export default function UsersAdminPage() {
  const { session, permissions } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('scrutiny_officer');
  const [newInstId, setNewInstId] = useState('');

  // Edit / Toggle User
  const [editUser, setEditUser] = useState<User | null>(null);

  const users = useMemo(() => getUsers(), [refreshKey]);
  const institutions = useMemo(() => getInstitutions(), []);

  // Access guard: only admin can manage users
  if (session && session.role !== 'admin') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">Administrator Access Required</h2>
        <p className="text-xs text-gray-600 mb-6">
          User account and role delegation is restricted exclusively to System Administrators.
        </p>
        <Link href="/dashboard" className="btn-secondary">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase());

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleToggleActive = (user: User) => {
    if (!session) return;
    if (user.id === session.userId) {
      alert('You cannot deactivate your own administrative account.');
      return;
    }
    updateUser(user.id, { active: !user.active }, session);
    setRefreshKey(k => k + 1);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newName.trim() || !newEmail.trim()) return;

    createUser({
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      institutionId: newRole === 'institution' ? newInstId : undefined,
      active: true,
    }, session);

    setCreateModalOpen(false);
    setNewName('');
    setNewEmail('');
    setNewRole('scrutiny_officer');
    setNewInstId('');
    setRefreshKey(k => k + 1);
  };

  const handleSaveRole = (newAssignedRole: Role) => {
    if (!session || !editUser) return;
    updateUser(editUser.id, { role: newAssignedRole }, session);
    setEditUser(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            User Accounts & Role Administration
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage user accounts, role assignments, and regulatory access permissions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus size={15} /> Add User
        </button>
      </div>

      {/* Role Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        {(Object.keys(ROLE_LABELS) as Role[]).map(r => {
          const count = users.filter(u => u.role === r && u.active).length;
          return (
            <div key={r} className="bg-white border rounded-xl p-3 shadow-xs" style={{ borderColor: 'var(--color-parchment)' }}>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block truncate">
                {ROLE_LABELS[r]}
              </span>
              <div className="text-xl font-serif font-bold text-gray-900 mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
                {count}
              </div>
              <span className="text-[10px] text-gray-400">Active accounts</span>
            </div>
          );
        })}
      </div>

      {/* Users Table Card */}
      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search user by name, email, or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-forest-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="border rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-700"
            >
              <option value="all">All Roles</option>
              <option value="institution">Institution</option>
              <option value="scrutiny_officer">Scrutiny Officer</option>
              <option value="senior_officer">Senior Officer</option>
              <option value="auditor">Auditor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b text-gray-600">
              <tr>
                <th className="p-3 font-semibold">User Details</th>
                <th className="p-3 font-semibold">Assigned Role</th>
                <th className="p-3 font-semibold">Institution Scope</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(user => {
                const inst = institutions.find(i => i.id === user.institutionId);
                const isCurrent = user.id === session?.userId;
                return (
                  <tr key={user.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        {user.name}
                        {isCurrent && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-forest-100 text-forest-800">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-[11px] font-mono">{user.email}</span>
                    </td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-800">
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">
                      {inst ? (
                        <div>
                          <span className="font-medium text-gray-800 block truncate max-w-[180px]">{inst.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{inst.aisheCode}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">National Scope</span>
                      )}
                    </td>
                    <td className="p-3">
                      {user.active ? (
                        <span className="status-badge status-verified">Active</span>
                      ) : (
                        <span className="status-badge status-neutral">Suspended</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditUser(user)}
                          className="btn-secondary text-[11px] px-2 py-1 flex items-center gap-1"
                          title="Change Role"
                        >
                          <Edit size={12} /> Role
                        </button>
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleToggleActive(user)}
                          className={`btn-secondary text-[11px] px-2 py-1 flex items-center gap-1 disabled:opacity-30 ${
                            user.active ? 'text-red-700 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                          title={user.active ? 'Suspend Account' : 'Activate Account'}
                        >
                          <Power size={12} />
                          {user.active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateUser} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900 flex items-center gap-2">
              <UserPlus size={18} className="text-forest-600" /> Add User Account
            </h3>
            <p className="text-xs text-gray-500">
              New accounts are immediately provisioned and active for login.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Verma"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. rajesh.verma@institution.edu.in"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Role *</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as Role)}
                  className="w-full border rounded-lg p-2.5 text-xs bg-white"
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              {newRole === 'institution' && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Assigned Institution *</label>
                  <select
                    value={newInstId}
                    onChange={e => setNewInstId(e.target.value)}
                    className="w-full border rounded-lg p-2.5 text-xs bg-white"
                    required
                  >
                    <option value="">-- Select Institution --</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name} ({inst.aisheCode})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Role Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-serif font-bold text-gray-900">
              Update Role for {editUser.name}
            </h3>
            <p className="text-xs text-gray-500">
              Select the revised role capability. Takes immediate effect on next interaction.
            </p>

            <div className="space-y-1 text-xs">
              {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSaveRole(r)}
                  className={`w-full text-left p-2.5 rounded-lg border font-medium transition-colors ${
                    editUser.role === r
                      ? 'border-forest-600 bg-forest-50 text-forest-900 font-semibold'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-gray-700'
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
