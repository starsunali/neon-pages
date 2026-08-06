'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { api } from '@/lib/api';
import { setTokens, setUser } from '@/lib/auth';
import PasswordStrength from '@/components/password-strength';

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const password = watch('password') ?? '';

  async function onLogin(values: LoginInput) {
    setServerError(null);
    try {
      const { data } = await api.post('/auth/login', {
        username: values.username,
        password: values.password,
        captcha: values.captcha,
      });
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      router.push(data.user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = anyErr.response?.data?.message;
      setServerError(Array.isArray(msg) ? msg[0] : msg ?? 'Login failed. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <form onSubmit={handleSubmit(onLogin)} noValidate className={shake ? 'animate-shake' : ''}>
      <div className="mb-4">
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-300">
          Username
        </label>
        <input
          id="username"
          autoComplete="username"
          {...register('username')}
          className="input-neon"
          placeholder="jdoe"
        />
        {errors.username && <p className="mt-1 text-xs text-pink-400">{errors.username.message}</p>}
      </div>

      <div className="mb-2">
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="input-neon"
          placeholder="••••••••"
        />
        {errors.password && <p className="mt-1 text-xs text-pink-400">{errors.password.message}</p>}
      </div>

      {password && (
        <div className="mb-4">
          <PasswordStrength password={password} />
        </div>
      )}

      <div className="mb-4 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="captcha" className="mb-1 block text-sm font-medium text-gray-300">
            CAPTCHA
          </label>
          <input
            id="captcha"
            autoComplete="off"
            {...register('captcha')}
            className="input-neon"
            placeholder="Enter code"
          />
        </div>
        {/* Placeholder CAPTCHA visual — swap with a real captcha widget. */}
        <div
          aria-hidden
          className="glass flex h-[46px] w-24 select-none items-center justify-center rounded-lg text-sm font-bold tracking-widest text-gray-200"
        >
          4K7P
        </div>
      </div>
      {errors.captcha && <p className="mb-3 text-xs text-pink-400">{errors.captcha.message}</p>}

      <div className="mb-5 flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-gray-300">
          <input type="checkbox" {...register('rememberMe')} className="h-4 w-4 accent-indigo-500" />
          Remember me
        </label>
        <a href="#" className="text-indigo-300 hover:text-indigo-200">
          Forgot password?
        </a>
      </div>

      {serverError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-sm text-pink-300"
        >
          {serverError}
        </motion.p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-neon w-full">
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="spinner" /> Signing in…
          </span>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
}