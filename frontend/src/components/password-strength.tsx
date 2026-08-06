'use client';

import { useMemo } from 'react';

/**
 * Password strength meter. Scores 0–4 based on length and character classes.
 */
function score(pw: string): { level: number; label: string; percent: number } {
  let level = 0;
  if (pw.length >= 8) level++;
  if (pw.length >= 12) level++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) level++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) level++;
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
  return { level, label: labels[level], percent: (level / 4) * 100 };
}

const COLORS = ['#f87171', '#fb923c', '#eab308', '#a3e635', '#34d399'];

export default function PasswordStrength({ password }: { password: string }) {
  const { level, label, percent } = useMemo(() => score(password), [password]);

  return (
    <div aria-live="polite">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, backgroundColor: COLORS[level] }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">Strength: {label}</p>
    </div>
  );
}