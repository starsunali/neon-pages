'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearTokens, getUser, isAdmin } from '@/lib/auth';
import { GlassCard } from '@/components/glass-card';
import AnimatedBackground from '@/components/animated-background';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalPages: number;
  totalViews: number;
  totalLogins: number;
}

interface UserRow {
  id: string;
  username: string;
  email: string | null;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface ActivityRow {
  id: number;
  action: string;
  entity: string | null;
  createdAt: string;
  user: { username: string } | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [statsRes, usersRes, activityRes] = await Promise.all([
      api.get('/admin/users/stats'),
      api.get(`/admin/users?page=${page}&limit=10&search=${encodeURIComponent(search)}`),
      api.get('/admin/users/activity'),
    ]);
    setStats(statsRes.data);
    setUsers(usersRes.data.items);
    setTotal(usersRes.data.pagination.total);
    setActivity(activityRes.data);
  }, [page, search]);

  useEffect(() => {
    if (!getUser() || !isAdmin()) {
      router.replace('/dashboard');
      return;
    }
    load().catch(() => undefined);
  }, [load, router]);

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${id}/active`, { isActive: !isActive });
      setNotice(`User ${isActive ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) {
      setNotice('Action failed');
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user? Their pages will be removed too.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setNotice('User deleted');
      load();
    } catch (err) {
      setNotice('Delete failed');
    }
  }

  const exportCsv = async () => {
    const res = await api.get('/admin/users/export');
    const blob = new Blob([res.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clearTokens();
    router.replace('/login');
  };

  return (
    <main className="relative min-h-screen px-6 py-10">
      <AnimatedBackground />
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">
            Admin <span className="neon-text">Panel</span>
          </h1>
          <div className="flex gap-3">
            <button onClick={exportCsv} className="btn-ghost">
              Export CSV
            </button>
            <button onClick={logout} className="btn-ghost">
              Logout
            </button>
          </div>
        </header>

        {notice && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {notice}
          </p>
        )}

        {/* Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['Users', stats?.totalUsers ?? 0],
            ['Active', stats?.activeUsers ?? 0],
            ['Pages', stats?.totalPages ?? 0],
            ['Views', stats?.totalViews ?? 0],
            ['Logins', stats?.totalLogins ?? 0],
          ].map(([label, value]) => (
            <GlassCard key={label} className="p-5 text-center">
              <p className="text-2xl font-bold neon-text">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-gray-400">{label}</p>
            </GlassCard>
          ))}
        </section>

        {/* User management */}
        <GlassCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Users</h2>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search username / e-mail…"
              className="input-neon max-w-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-2 pr-4">Username</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5">
                    <td className="py-2 pr-4 font-medium">{u.username}</td>
                    <td className="py-2 pr-4 text-gray-400">{u.email ?? '—'}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={u.isActive ? 'text-emerald-300' : 'text-pink-400'}>
                        {u.isActive ? 'active' : 'disabled'}
                        {u.isLocked ? ' · locked' : ''}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => toggleActive(u.id, u.isActive)} className="btn-ghost mr-2 !px-3 !py-1 text-xs">
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="btn-ghost !px-3 !py-1 text-xs text-pink-300">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <span>
              {total} user{total === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-ghost !px-3 !py-1">
                ← Prev
              </button>
              <button onClick={() => setPage((p) => p + 1)} className="btn-ghost !px-3 !py-1">
                Next →
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Recent activity */}
        <GlassCard>
          <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2">
                <span>
                  <span className="font-mono text-xs text-indigo-300">{a.action}</span>
                  <span className="ml-2 text-gray-400">
                    {a.user ? `by ${a.user.username}` : 'system'}
                  </span>
                </span>
                <span className="text-gray-500">{new Date(a.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </main>
  );
}