/**
 * Loader — spinner component used inside buttons and as a full-page overlay.
 *
 * Props:
 *  size    : 'sm' | 'md' | 'lg' | 'full'
 *  color   : 'cyan' | 'green' | 'white' | 'dark'
 *  overlay : boolean — wraps in a full-screen translucent backdrop
 *  text    : string — label shown below spinner (overlay mode)
 */

import React from 'react'

const SIZE_MAP = {
  sm:   'w-4 h-4 border-2',
  md:   'w-8 h-8 border-2',
  lg:   'w-12 h-12 border-3',
  full: 'w-16 h-16 border-4',
}

const COLOR_MAP = {
  cyan:  'border-cyan-500/30 border-t-cyan-400',
  green: 'border-green-500/30 border-t-green-400',
  white: 'border-white/20 border-t-white',
  dark:  'border-gray-800/40 border-t-gray-900',
}

const Loader = ({ size = 'md', color = 'cyan', overlay = false, text = '' }) => {
  if (overlay) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center
                   bg-gray-950/80 backdrop-blur-sm"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          {/* Outer glow ring */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-cyan-500/10 animate-pulse-slow" />
            <Loader size="full" color="cyan" />
          </div>
          {text && <p className="text-gray-400 text-sm animate-pulse">{text}</p>}
        </div>
      </div>
    )
  }

  return (
    <div
      className={[
        'rounded-full animate-spin',
        SIZE_MAP[size] ?? SIZE_MAP.md,
        COLOR_MAP[color] ?? COLOR_MAP.cyan,
      ].join(' ')}
      role="status"
      aria-label="Loading"
    />
  )
}

export default Loader
