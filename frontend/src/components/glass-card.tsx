import { motion } from 'framer-motion';
import { ElementType, useMemo } from 'react';

interface GlassCardProps {
  as?: ElementType;
  className?: string;
  children: React.ReactNode;
}

/**
 * Glassmorphism card with a subtle entrance animation.
 *
 * IMPORTANT: the motion component is memoized by `as`. If we created it inline
 * (`motion(as ?? 'div')`) a NEW component type would be produced on every render,
 * causing React to unmount/remount the card's children each time — which resets
 * input focus/state (e.g. a search box). Memoizing keeps children stable.
 */
export function GlassCard({ as, className = '', children }: GlassCardProps) {
  const MotionTag = useMemo(() => motion(as ?? 'div') as typeof motion.div, [as]);
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