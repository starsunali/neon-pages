'use client';

import { motion } from 'framer-motion';

/**
 * Animated neon background used across login / auth screens.
 * Respects prefers-reduced-motion via CSS (see globals.css).
 */
export default function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-base bg-grid">
      <motion.div
        initial={{ opacity: 0.4, scale: 0.9 }}
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-neon-blue/30 blur-[120px]"
      />
      <motion.div
        initial={{ opacity: 0.3, scale: 1 }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-0 right-0 h-[30rem] w-[30rem] rounded-full bg-neon-purple/30 blur-[130px]"
      />
      <motion.div
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-neon-cyan/20 blur-[110px]"
      />
    </div>
  );
}