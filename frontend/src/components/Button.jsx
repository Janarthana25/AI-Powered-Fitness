/**
 * Button — reusable button component with multiple variants.
 *
 * Props:
 *  variant   : 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
 *  size      : 'sm' | 'md' | 'lg'
 *  loading   : boolean — shows spinner and disables interaction
 *  fullWidth : boolean
 *  icon      : React node — prepended to label
 *  ...rest   : forwarded to <button>
 */

import React from 'react'
import Loader from './Loader'

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 ' +
    'text-gray-950 font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-400/40 ' +
    'hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-300 ' +
    'text-gray-950 font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-400/40 ' +
    'hover:scale-[1.02] active:scale-[0.98]',
  outline:
    'border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 ' +
    'hover:scale-[1.02] active:scale-[0.98]',
  ghost:
    'text-gray-300 hover:text-white hover:bg-white/5 active:scale-[0.98]',
  danger:
    'bg-red-600/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 ' +
    'hover:scale-[1.02] active:scale-[0.98]',
}

const SIZES = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-sm rounded-xl',
  lg: 'px-8 py-4 text-base rounded-xl',
}

const Button = React.forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon = null,
      className = '',
      disabled,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center gap-2 transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60',
          VARIANTS[variant] ?? VARIANTS.primary,
          SIZES[size] ?? SIZES.md,
          fullWidth ? 'w-full' : '',
          isDisabled ? 'opacity-50 cursor-not-allowed !scale-100' : 'cursor-pointer',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {(loading || icon) && (
          <span className="flex-shrink-0">
            {loading
              ? <Loader size="sm" color={variant === 'outline' ? 'cyan' : 'dark'} />
              : icon
            }
          </span>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
