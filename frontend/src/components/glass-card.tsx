import { motion } from 'framer-motion';
import { ElementType } from 'react';

interface GlassCardProps {
  as?: ElementType;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper for a glassmorphism card with a subtle entrance animation.
 * (Plain element — no ref forwarding; annotate with a role if a ref is needed.)
 */
export function GlassCard({ as, className = '', children }: GlassCardProps) {
  const MotionTag = motion(as ?? 'div');
  return (
    <MotionTag
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('glass p-8', className)}
    >
      {children}
    </MotionTag>
  );
}

function cn(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ');
}