import { motion } from 'framer-motion';
import { ElementType, forwardRef } from 'react';

interface GlassCardProps {
  as?: ElementType;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper for a glassmorphism card with a subtle entrance animation.
 */
export const GlassCard = forwardRef<HTMLElement, GlassCardProps>(function GlassCard(
  { as: Tag = 'div', className = '', children },
  ref,
) {
  const MotionTag = motion(Tag) as typeof motion.div;
  return (
    <MotionTag
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('glass p-8', className)}
    >
      {children}
    </MotionTag>
  );
});

function cn(...args: (string | false | undefined)[]) {
  return args.filter(Boolean).join(' ');
}