/**
 * Card — glassmorphism container card.
 *
 * Props:
 *  className : extra Tailwind classes
 *  glow      : 'cyan' | 'green' | none — adds a subtle glow border
 *  padding   : 'sm' | 'md' | 'lg' — controls internal padding
 *  animate   : boolean — fade-in + slide-up on mount
 */

import React from 'react'

const PADDING = {
  sm: 'p-4',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-10',
}

const GLOW = {
  cyan:  'shadow-xl shadow-cyan-500/10  border-cyan-500/15',
  green: 'shadow-xl shadow-green-500/10 border-green-500/15',
}

const Card = ({ children, className = '', glow, padding = 'md', animate = false }) => {
  return (
    <div
      className={[
        'glass',
        PADDING[padding] ?? PADDING.md,
        glow ? GLOW[glow] : '',
        animate ? 'animate-slide-up' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export default Card
