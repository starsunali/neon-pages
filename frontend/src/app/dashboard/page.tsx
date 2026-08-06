'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearTokens, getAccessToken, getUser, type AuthUser } from '@/lib/auth';
import QrCodeView from '@/components/qr-code';
import { GlassCard } from '@/components/glass-card';
import AnimatedBackground from '@/components/animated-background';

interface MyPage {
  slug: string;
  title: string;
  content: string;
  qrCodePng: string | null;
  qrCodeSvg: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [page, setPage] = useState<MyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    api
      .get('/pages/me')
      .then((res) => setPage(res.data))
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [router]);

  const publicUrl = page ? `${window.location.origin}/p/${page.slug}` : '';

  const copyLink = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('Could not copy link automatically');
    }
  }, [publicUrl]);

  const downloadQr = useCallback(async () => {
    if (!page?.qrCodePng) return;
    const filename = page.qrCodePng.split('/').pop();
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/v1/files/qr/${filename}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.slug}-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [page]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clearTokens();
    router.replace('/login');
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="spinner" />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen px-6 py-10">
      <AnimatedBackground />
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome, <span className="neon-text">{user?.username}</span> 👋
            </h1>
            <p className="mt-1 text-sm text-gray-400">Your personal page & QR code</p>
          </div>
          <div className="flex gap-3">
            <a href="/profile" className="btn-ghost">
              Profile
            </a>
            <button onClick={logout} className="btn-ghost">
              Logout
            </button>
          </div>
        </header>

        {notice && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            {notice}
          </p>
        )}

        {page ? (
          <div className="grid gap-6 md:grid-cols-2">
            <GlassCard className="flex flex-col items-center text-center">
              <h2 className="mb-4 text-lg font-semibold">{page.title}</h2>
              <QrCodeView value={publicUrl} size={200} />
              <p className="mt-4 break-all text-sm text-gray-400">{publicUrl}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button onClick={copyLink} className="btn-neon">
                  {copied ? '✓ Copied!' : 'Copy link'}
                </button>
                <button onClick={downloadQr} className="btn-ghost">
                  Download QR
                </button>
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="mb-4 text-lg font-semibold">Page preview</h2>
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm text-gray-300">
                {page.content}
              </div>
              <a href={`/p/${page.slug}`} className="btn-ghost mt-4 inline-block" target="_blank">
                Open public page ↗
              </a>
            </GlassCard>
          </div>
        ) : (
          <GlassCard className="text-center">
            <h2 className="text-xl font-semibold">You don&apos;t have a page yet</h2>
            <p className="mt-2 text-gray-400">Create your first page to get your QR code.</p>
            <a href="/profile" className="btn-neon mt-6 inline-block">
              Create my page
            </a>
          </GlassCard>
        )}
      </div>
    </main>
  );
}