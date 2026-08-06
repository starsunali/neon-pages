'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api';
import { clearTokens, getUser } from '@/lib/auth';
import { GlassCard } from '@/components/glass-card';
import AnimatedBackground from '@/components/animated-background';
import PasswordStrength from '@/components/password-strength';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validators';

export default function ProfilePage() {
  const router = useRouter();

  const pwForm = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const newPassword = pwForm.watch('newPassword') ?? '';
  const error = pwForm.formState.errors;

  useEffect(() => {
    if (!getUser()) {
      router.replace('/login');
    }
  }, [router]);

  async function onChangePassword(values: ChangePasswordInput) {
    try {
      await api.post('/auth/change-password', values);
      pwForm.reset();
      clearTokens();
      setTimeout(() => router.replace('/login'), 1200);
      // The session is invalidated on password change, so we sign the user out.
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message;
      pwForm.setError('root', { message: Array.isArray(m) ? m[0] : m ?? 'Could not change password' });
    }
  }

  return (
    <main className="relative min-h-screen px-6 py-10">
      <AnimatedBackground />
      <div className="mx-auto max-w-lg space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="neon-text">Profile</span>
          </h1>
          <a href="/dashboard" className="btn-ghost">
            ← Dashboard
          </a>
        </header>

        <GlassCard>
          <h2 className="mb-1 text-lg font-semibold">Change password</h2>
          <p className="mb-5 text-sm text-gray-400">
            After changing your password you will be signed out and need to log in again.
          </p>

          {error?.root?.message && (
            <p className="mb-4 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm text-pink-300">
              {error.root.message}
            </p>
          )}

          <form onSubmit={pwForm.handleSubmit(onChangePassword)} noValidate className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Current password</label>
              <input
                type="password"
                {...pwForm.register('currentPassword')}
                className="input-neon"
              />
              {error.currentPassword && (
                <p className="mt-1 text-xs text-pink-400">{error.currentPassword.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">New password</label>
              <input type="password" {...pwForm.register('newPassword')} className="input-neon" />
              {error.newPassword && (
                <p className="mt-1 text-xs text-pink-400">{error.newPassword.message}</p>
              )}
            </div>
            {newPassword && <PasswordStrength password={newPassword} />}
            <div>
              <label className="mb-1 block text-sm text-gray-300">Confirm new password</label>
              <input type="password" {...pwForm.register('confirmPassword')} className="input-neon" />
              {error.confirmPassword && (
                <p className="mt-1 text-xs text-pink-400">{error.confirmPassword.message}</p>
              )}
            </div>
            <button type="submit" className="btn-neon" disabled={pwForm.formState.isSubmitting}>
              {pwForm.formState.isSubmitting ? <span className="spinner" /> : 'Update password'}
            </button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}