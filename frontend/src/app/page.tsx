import Link from 'next/link';
import AnimatedBackground from '@/components/animated-background';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <AnimatedBackground />
      <div className="glass-strong max-w-2xl p-10">
        <h1 className="text-5xl font-extrabold tracking-tight">
          <span className="neon-text">Neon Pages</span>
        </h1>
        <p className="mt-4 text-lg text-gray-300">
          Create your page, get a beautiful high-resolution <span className="font-semibold text-indigo-300">QR code</span>,
          and share your public link with anyone.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login" className="btn-neon">
            Sign in
          </Link>
          <Link href="/p/welcome" className="btn-ghost">
            View sample page
          </Link>
        </div>
      </div>
    </main>
  );
}