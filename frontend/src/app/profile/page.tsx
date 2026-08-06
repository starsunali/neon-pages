'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { clearTokens, getUser } from '@/lib/auth';
import { GlassCard } from '@/components/glass-card';
import AnimatedBackground from '@/components/animated-background';
import PasswordStrength from '@/components/password-strength';
import {
  changePasswordSchema,
  createPageSchema,
  type ChangePasswordInput,
  type CreatePageInput,
} from '@/lib/validators';

export default function ProfilePage() {
  const router = useRouter();
  const [hasPage, setHasPage] = useState(false);
  const [pageSlug, setPageSlug] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pageForm = useForm<CreatePageInput>({ resolver: zodResolver(createPageSchema) });
  const pwForm = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const newPassword = pwForm.watch('newPassword') ?? '';

  useEffect(() => {
    if (!getUser()) {
      router.replace('/login');
      return;
    }
    api
      .get('/pages/me')
      .then((res) => {
        if (res.data) {
          setHasPage(true);
          setPageSlug(res.data.slug);
          pageForm.reset({
            slug: res.data.slug,
            title: res.data.title,
            content: res.data.content,
          });
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onSavePage(values: CreatePageInput) {
    setError(null);
    setNotice(null);
    try {
      if (hasPage) {
        await api.patch('/pages/me', values);
        setNotice('Page updated ✓');
      } else {
        await api.post('/pages/me', values);
        setNotice('Page created ✓ — QR code generated');
        setHasPage(true);
      }
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      setError(Array.isArray(m) ? m[0] : m ?? 'Could not save page');
    }
  }

  async function onChangePassword(values: ChangePasswordInput) {
    setError(null);
    setNotice(null);
    try {
      await api.post('/auth/change-password', values);
      setNotice('Password changed — please sign in again');
      clearTokens();
      setTimeout(() => router.replace('/login'), 1200);
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      setError(Array.isArray(m) ? m[0] : m ?? 'Could not change password');
    }
  }

  return (
    <main className="relative min-h-screen px-6 py-10">
      <AnimatedBackground />
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="neon-text">Profile</span>
          </h1>
          <a href="/dashboard" className="btn-ghost">
            ← Dashboard
          </a>
        </header>

        {notice && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm text-pink-300">
            {error}
          </p>
        )}

        <GlassCard>
          <h2 className="mb-1 text-lg font-semibold">
            {hasPage ? 'Edit your page' : 'Create your page'}
          </h2>
          <p className="mb-5 text-sm text-gray-400">
            Your public URL: <code className="text-indigo-300">/p/{pageSlug || 'your-slug'}</code>
          </p>
          <form onSubmit={pageForm.handleSubmit(onSavePage)} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Slug</label>
              <input
                {...pageForm.register('slug')}
                className="input-neon"
                placeholder="my-product"
                disabled={hasPage}
              />
              {pageForm.formState.errors.slug && (
                <p className="mt-1 text-xs text-pink-400">
                  {pageForm.formState.errors.slug.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Title</label>
              <input
                {...pageForm.register('title')}
                className="input-neon"
                placeholder="My Product"
              />
              {pageForm.formState.errors.title && (
                <p className="mt-1 text-xs text-pink-400">
                  {pageForm.formState.errors.title.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Content (Markdown)</label>
              <textarea
                {...pageForm.register('content')}
                rows={6}
                className="input-neon"
                placeholder="## Overview&#10;Describe your page…"
              />
              {pageForm.formState.errors.content && (
                <p className="mt-1 text-xs text-pink-400">
                  {pageForm.formState.errors.content.message}
                </p>
              )}
            </div>
            <button type="submit" className="btn-neon" disabled={pageForm.formState.isSubmitting}>
              {hasPage ? 'Save changes' : 'Create page & generate QR'}
            </button>
          </form>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-5 text-lg font-semibold">Change password</h2>
          <form onSubmit={pwForm.handleSubmit(onChangePassword)} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Current password</label>
              <input
                type="password"
                {...pwForm.register('currentPassword')}
                className="input-neon"
              />
              {pwForm.formState.errors.currentPassword && (
                <p className="mt-1 text-xs text-pink-400">
                  {pwForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">New password</label>
              <input type="password" {...pwForm.register('newPassword')} className="input-neon" />
              {pwForm.formState.errors.newPassword && (
                <p className="mt-1 text-xs text-pink-400">
                  {pwForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            {newPassword && <PasswordStrength password={newPassword} />}
            <div>
              <label className="mb-1 block text-sm text-gray-300">Confirm new password</label>
              <input type="password" {...pwForm.register('confirmPassword')} className="input-neon" />
              {pwForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-pink-400">
                  {pwForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <button type="submit" className="btn-neon" disabled={pwForm.formState.isSubmitting}>
              Update password
            </button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}