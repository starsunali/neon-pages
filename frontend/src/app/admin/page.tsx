'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearTokens, getUser, isAdmin } from '@/lib/auth';
import { GlassCard } from '@/components/glass-card';
import AnimatedBackground from '@/components/animated-background';

const PAGE_SIZE = 5; // pagination threshold (ask: show prev/next only when total > 5)

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
  pages?: { slug: string; title: string | null; isPublished: boolean }[];
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
  const [total, setTotal] = useState(0);

  // Search runs in its own component so the field never loses focus while
  // typing; the parent only updates when a (debounced) value is emitted.
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);

  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'ok' | 'err'>('ok');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [editPage, setEditPage] = useState<{ slug: string; title: string } | null>(null);
  // Guards against out-of-order responses (latest request wins).
  const loadRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadRef.current;
    setSearching(true);
    try {
      const [statsRes, usersRes, activityRes] = await Promise.all([
        api.get('/admin/users/stats'),
        api.get(
          `/admin/users?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(search)}`,
        ),
        api.get('/admin/users/activity'),
      ]);
      if (seq !== loadRef.current) return; // a newer request superseded this one
      setStats(statsRes.data);
      setUsers(usersRes.data.items);
      setTotal(usersRes.data.pagination.total);
      setActivity(activityRes.data);
    } finally {
      if (seq === loadRef.current) setSearching(false);
    }
  }, [page, search]);

  // Stable callback so the search box effect never gets re-created mid-typing.
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!getUser() || !isAdmin()) {
      router.replace('/dashboard');
      return;
    }
    load().catch(() => undefined);
  }, [load, router]);

  // Success/error notice stays until the admin performs another action.
  const tell = (msg: string, tone: 'ok' | 'err' = 'ok') => {
    setNotice(msg);
    setNoticeTone(tone);
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showPager = total > PAGE_SIZE;

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await api.patch(`/admin/users/${id}/active`, { isActive: !isActive });
      tell(`User ${isActive ? 'disabled' : 'enabled'}`);
      load();
    } catch {
      tell('Action failed', 'err');
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user? Their pages will be removed too.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      tell('User deleted');
      load();
    } catch {
      tell('Delete failed', 'err');
    }
  }

  const exportCsv = async () => {
    try {
      const res = await api.get('/admin/users/export');
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      tell('Export failed', 'err');
    }
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

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <main className="relative min-h-screen px-6 py-10">
      <AnimatedBackground />
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">
            Admin <span className="neon-text">Panel</span>
          </h1>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setCreateOpen(true)} className="btn-neon">
              + Add new user
            </button>
            <button onClick={exportCsv} className="btn-ghost">
              Export CSV
            </button>
            <button onClick={logout} className="btn-ghost">
              Logout
            </button>
          </div>
        </header>

        {notice && (
          <p
            className={`rounded-lg border px-3 py-2 text-sm ${
              noticeTone === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-pink-500/30 bg-pink-500/10 text-pink-300'
            }`}
          >
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
            <UserSearchBox busy={searching} onSearch={handleSearch} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Page link</th>
                  <th className="py-2 pr-3">E-mail</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const p = u.pages?.[0];
                  const slug = p?.slug;
                  const link = slug ? `${origin}/p/${slug}` : null;
                  return (
                    <tr key={u.id} className="border-b border-white/5 align-top">
                      <td className="py-2 pr-3 font-medium">{u.username}</td>
                      <td className="py-2 pr-3">
                        {link ? (
                          <button
                            onClick={() =>
                              p && setEditPage({ slug: p.slug, title: p.title ?? '' })
                            }
                            className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 hover:text-indigo-200"
                            title="Open in page editor"
                          >
                            /p/{slug}
                          </button>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-gray-400">{u.email ?? '—'}</td>
                      <td className="py-2 pr-3">
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
                      <td className="py-2 pr-3">
                        <span className={u.isActive ? 'text-emerald-300' : 'text-pink-400'}>
                          {u.isActive ? 'active' : 'disabled'}
                          {u.isLocked ? ' · locked' : ''}
                        </span>
                      </td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => setResetUser(u)}
                          className="btn-ghost mr-2 !px-3 !py-1 text-xs"
                        >
                          Reset password
                        </button>
                        <button
                          onClick={() => toggleActive(u.id, u.isActive)}
                          className="btn-ghost mr-2 !px-3 !py-1 text-xs"
                        >
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
                          className="btn-ghost !px-3 !py-1 text-xs text-pink-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No users{search ? ` matching “${search}”` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination — only shown when more than PAGE_SIZE users exist */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
            <span>
              {total} user{total === 1 ? '' : 's'} · page {page}/{pageCount}
            </span>
            {showPager && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-ghost !px-3 !py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="btn-ghost !px-3 !py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Recent activity */}
        <GlassCard>
          <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
          <ul className="space-y-2 text-sm">
            {activity.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2"
              >
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

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            tell('User created');
            load();
          }}
          onError={(m) => tell(m, 'err')}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onDone={(m) => {
            setResetUser(null);
            tell(m);
          }}
          onError={(m) => tell(m, 'err')}
        />
      )}

      {editPage && (
        <PageEditorModal
          slug={editPage.slug}
          initialTitle={editPage.title}
          origin={origin}
          onClose={() => setEditPage(null)}
          onSaved={() => {
            tell('Page saved');
            load();
          }}
          onError={(m) => tell(m, 'err')}
        />
      )}
    </main>
  );
}

/* =====================================================================
 *  Create user modal
 * ================================================================== */
function CreateUserModal({
  onClose,
  onCreated,
  onError,
}: {
  onClose: () => void;
  onCreated: () => void;
  onError: (m: string) => void;
}) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>('USER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parsePageSlug(raw: string): string {
    const s = raw.trim().toLowerCase();
    const m =
      s.match(/\/p\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/) ||
      s.match(/^([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    return m ? m[1] : '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (username.trim().length < 3) return setError('Username must be at least 3 characters.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('A valid e-mail is required.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');

    const pageSlug = parsePageSlug(pageUrl);
    if (!pageUrl.trim()) {
      return setError('Public page URL is required — every user needs a page.');
    }
    if (!pageSlug) {
      return setError('Public page URL must be a slug like "my-page" or a link like https://…/p/my-page');
    }

    setBusy(true);
    setError(null);
    try {
      await api.post('/admin/users', {
        username: username.trim(),
        email,
        password,
        role,
        pageSlug: pageSlug || undefined,
      });
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Could not create user');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Add new user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Username">
          <input className="input-neon" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jdoe" />
        </Field>
        <Field label="E-mail">
          <input type="email" className="input-neon" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jdoe@example.com" />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={setPassword} placeholder="e.g. Str0ng!Pass" />
        </Field>
        <Field label="Public page URL (create their page)" hint="Required — e.g. my-page or https://…/p/my-page">
          <input className="input-neon" value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="my-page" />
        </Field>
        <Field label="Role">
          <select className="input-neon" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
        {error && <p className="text-sm text-pink-300">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-neon">
            {busy ? <span className="spinner" /> : 'Create user'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* =====================================================================
 * Reset password modal
 * ================================================================== */
function ResetPasswordModal({
  user,
  onClose,
  onDone,
  onError,
}: {
  user: UserRow;
  onClose: () => void;
  onDone: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/users/${user.id}/reset-password`, { newPassword: password });
      onDone(`Password reset for ${user.username}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Reset password — ${user.username}`}
      subtitle="Passwords are stored as irreversible hashes (Argon2) and can never be displayed, so admin resets a new one instead."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password">
          <PasswordInput value={password} onChange={setPassword} placeholder="e.g. Str0ng!Pass" />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="repeat it" />
        </Field>
        {error && <p className="text-sm text-pink-300">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="btn-neon">
            {busy ? <span className="spinner" /> : 'Set new password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* =====================================================================
 * GUI page editor modal (opens when an admin clicks a user's page link)
 * ================================================================== */
function PageEditorModal({
  slug,
  initialTitle,
  origin,
  onClose,
  onSaved,
  onError,
}: {
  slug: string;
  initialTitle: string;
  origin: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [slugValue, setSlugValue] = useState(slug);
  const [content, setContent] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const publicUrl = `${origin}/p/${slugValue}`;

  useEffect(() => {
    api
      .get(`/admin/pages/${slug}`)
      .then((res) => {
        setSlugValue(res.data.slug ?? slug);
        setTitle(res.data.title ?? initialTitle);
        setContent(res.data.content ?? '');
        setSeoTitle(res.data.seoTitle ?? '');
        setDescription(res.data.description ?? '');
        setIsPublished(res.data.isPublished ?? true);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load this page.');
        setLoading(false);
      });
  }, [slug, initialTitle]);

  function insert(token: string) {
    const ta = taRef.current;
    if (ta) {
      const start = ta.selectionStart ?? content.length;
      const end = ta.selectionEnd ?? content.length;
      const next = content.slice(0, start) + token.slice(0, 2) + content.slice(start, end) + token.slice(2) + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + 2, end + token.slice(2).length);
      });
    } else {
      setContent((c) => (c ? c + '\n' : '') + token);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/admin/pages/${slug}`, {
        slug: slugValue,
        title,
        content,
        seoTitle: seoTitle || null,
        description: description || null,
        isPublished,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg ?? 'Failed to save');
      setBusy(false);
    }
  }

  const toolbar: { label: string; token: string; title: string }[] = [
    { label: 'B', token: '**bold**', title: 'Bold' },
    { label: 'I', token: '*italic*', title: 'Italic' },
    { label: 'H2', token: '## Heading\n', title: 'Heading 2' },
    { label: 'H3', token: '### Heading\n', title: 'Heading 3' },
    { label: '•', token: '- item\n', title: 'Bullet list' },
    { label: '1.', token: '1. item\n', title: 'Numbered list' },
    { label: '🔗', token: '[link text](https://example.com)', title: 'Link' },
  ];

  return (
    <Modal title={`Edit page — /p/${slugValue}`} onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-10">
          <span className="spinner" />
        </div>
      ) : (
        <div className="space-y-4">
          {error && <p className="text-sm text-pink-300">{error}</p>}

          <Field label="Public URL (slug)" hint="Lowercase letters, numbers and hyphens. Changes the public link and regenerates the QR code.">
            <input
              className="input-neon"
              value={slugValue}
              onChange={(e) => setSlugValue(e.target.value.toLowerCase())}
            />
          </Field>

          <Field label="Title">
            <input className="input-neon" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm text-gray-300">Content (Markdown)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreview(false)}
                  className={`rounded px-2 py-1 text-xs ${!preview ? 'bg-indigo-500/30 text-indigo-200' : 'text-gray-400'}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setPreview(true)}
                  className={`rounded px-2 py-1 text-xs ${preview ? 'bg-indigo-500/30 text-indigo-200' : 'text-gray-400'}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {!preview ? (
              <>
                {/* Toolbar */}
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {toolbar.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      title={b.title}
                      onClick={() => insert(b.token)}
                      className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:border-indigo-400/50 hover:bg-indigo-500/20"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                {/* Editor */}
                <textarea
                  ref={taRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={12}
                  className="input-neon min-h-[240px] font-mono"
                  placeholder="Write with Markdown — use the toolbar for formatting…"
                />
              </>
            ) : (
              <div className="min-h-[240px] overflow-auto rounded-lg border border-white/10 bg-[#0b0b1a]/60 p-4 text-gray-200">
                <MarkdownPreview text={content} />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title">
              <input className="input-neon" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </Field>
            <Field label="Meta description">
              <input className="input-neon" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            Published (visible at <span className="font-mono text-indigo-300">/p/{slugValue}</span>)
          </label>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-3">
            <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 text-xs">
              Open public page ↗
            </a>
            <button onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button onClick={save} disabled={busy} className="btn-neon">
              {busy ? <span className="spinner" /> : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* =====================================================================
 * Shared building blocks
 * ================================================================== */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

/* Password field that hides the value until the eye icon is toggled. */
function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="input-neon pr-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2.5 py-1.5 text-gray-400 hover:text-white"
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M14.12 14.12a3 3 0 1 0-4.24-4.24" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

/* Dedicated, polished search box: search icon + clear button, instant typing,
   Enter searches immediately. Debounced; parent callback is stable. */
function UserSearchBox({
  busy,
  onSearch,
}: {
  busy: boolean;
  onSearch: (q: string) => void;
}) {
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => onSearch(q), 350);
    return () => clearTimeout(t);
  }, [q, onSearch]);

  return (
    <div className="relative w-full max-w-xs">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
      >
        🔍
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSearch(q);
          }
        }}
        placeholder="Search users…"
        spellCheck={false}
        autoComplete="off"
        className="input-neon w-full pl-9 pr-9"
      />
      {busy ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="spinner" />
        </span>
      ) : q ? (
        <button
          type="button"
          onClick={() => setQ('')}
          aria-label="Clear search"
          title="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`glass-strong w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-white/10 px-2 text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Minimal, XSS-safe Markdown renderer for the live preview. */
function MarkdownPreview({ text }: { text: string }) {
  if (!text) return <p className="text-gray-500">Nothing to preview.</p>;
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: number) => {
    if (list.length) {
      out.push(
        <ul key={key} className="my-1 list-disc space-y-1 pl-5">
          {list.map((li, i) => (
            <li key={i}>{renderInline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList(out.length as number);
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ''));
      return;
    }
    flushList(i);
    const m = line.match(/^(#{1,3})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      const Tag = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as 'h1' | 'h2' | 'h3';
      out.push(
        <Tag key={i} className="mb-1 font-semibold text-gray-100 neon-glow">
          {renderInline(m[2])}
        </Tag>,
      );
      return;
    }
    out.push(
      <p key={i} className="my-1 text-gray-200">
        {renderInline(line)}
      </p>,
    );
  });
  flushList(lines.length + 9999);
  return <>{out}</>;
}

/* Inline formatting: escape HTML then apply **bold**, *italic*, [t](url). */
function renderInline(text: string): ReactNode[] {
  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const nodes: ReactNode[] = [];
  const parts = esc.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  parts.forEach((part, idx) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) {
      nodes.push(<strong key={idx}>{bold[1]}</strong>);
      return;
    }
    const ital = part.match(/^\*(.+)\*$/);
    if (ital) {
      nodes.push(<em key={idx}>{ital[1]}</em>);
      return;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && /^(https?:|mailto:|#|\/)/i.test(link[2]) && !/javascript:/i.test(link[2])) {
      nodes.push(
        <a key={idx} href={link[2]} target="_blank" rel="noreferrer" className="text-indigo-300 underline">
          {link[1]}
        </a>,
      );
      return;
    }
    nodes.push(part);
  });
  return nodes;
}