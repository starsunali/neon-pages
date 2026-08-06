import type { Metadata } from 'next';
import AnimatedBackground from '@/components/animated-background';
import LoginForm from '@/components/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <AnimatedBackground />
      <div className="glass-strong w-full max-w-md p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">
            <span className="neon-text">Neon Pages</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">Sign in to your account</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-gray-500">
          Demo accounts: <code className="text-indigo-300">admin / Admin@12345</code> ·{' '}
          <code className="text-indigo-300">demo / User@12345</code>
        </p>
      </div>
    </main>
  );
}