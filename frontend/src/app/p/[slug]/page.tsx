import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AnimatedBackground from '@/components/animated-background';

export const dynamic = 'force-dynamic';

async function fetchPage(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  const res = await fetch(`${apiUrl}/p/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

interface PublicPageData {
  slug: string;
  title: string;
  content: string;
  seoTitle?: string | null;
  description?: string | null;
  updatedAt: string;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = await fetchPage(params.slug);
  return {
    title: page?.seoTitle ?? page?.title ?? 'Not found',
    description: page?.description ?? undefined,
  };
}

export default async function PublicPage({ params }: { params: { slug: string } }) {
  const page: PublicPageData | null = await fetchPage(params.slug);
  if (!page) notFound();

  return (
    <main className="relative min-h-screen px-6 py-12">
      <AnimatedBackground />
      <article className="glass-strong mx-auto max-w-3xl p-8 sm:p-12">
        <h1 className="mb-2 text-4xl font-extrabold">
          <span className="neon-text">{page.title}</span>
        </h1>
        <p className="mb-8 text-xs text-gray-500">
          Updated {new Date(page.updatedAt).toLocaleDateString()} · public page
        </p>
        <div className="whitespace-pre-wrap leading-relaxed text-gray-200">{page.content}</div>
      </article>
    </main>
  );
}