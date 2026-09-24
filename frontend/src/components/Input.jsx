/**
 * Input — reusable form input with label, error state, and optional icon slots.
 *
 * Props:
 *  label       : string
 *  error       : string — validation message shown below
 *  leftIcon    : React node
 *  rightIcon   : React node — e.g. password toggle button
 *  helperText  : string — subtle hint shown when no error
 *  ...rest     : forwarded to <input>
 */

import React from 'react'

const Input = React.forwardRef(
  ({ label, error, leftIcon, rightIcon, helperText, className = '', id, ...rest }, ref) => {
    // Auto-generate id from label if not provided
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-gray-400 uppercase tracking-wider"
          >
            {label}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              'input-base',
              leftIcon  ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              error     ? 'input-error' : '',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...rest}
          />

          {/* Right icon */}
          {rightIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightIcon}
            </span>
          )}
        </div>

        {/* Error or helper text */}
        {error ? (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-xs text-red-400 flex items-center gap-1 mt-0.5"
          >
            <span aria-hidden="true">⚠</span> {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-gray-600 mt-0.5">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
