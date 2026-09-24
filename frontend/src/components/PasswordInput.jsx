/**
 * PasswordInput — Input variant with show/hide toggle and strength indicator.
 *
 * Props:
 *  showStrength : boolean — renders a 4-segment strength bar below the input
 *  ...rest      : forwarded to <Input>
 */

import React, { useState } from 'react'
import { HiEye, HiEyeOff } from 'react-icons/hi'
import { HiLockClosed } from 'react-icons/hi'
import Input from './Input'

/** Returns { score: 0-4, label, color } for a given password string. */
const getStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8)                          score++
  if (/[A-Z]/.test(password))                       score++
  if (/\d/.test(password))                          score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password))     score++

  const map = [
    { label: 'Too Weak',  color: 'bg-red-500' },
    { label: 'Weak',      color: 'bg-orange-500' },
    { label: 'Fair',      color: 'bg-yellow-400' },
    { label: 'Strong',    color: 'bg-green-400' },
    { label: 'Very Strong', color: 'bg-cyan-400' },
  ]
  return { score, ...map[score] }
}

const PasswordInput = React.forwardRef(
  ({ showStrength = false, value = '', ...rest }, ref) => {
    const [visible, setVisible] = useState(false)
    const strength = showStrength ? getStrength(value) : null

    const toggle = (e) => {
      e.preventDefault()
      setVisible((v) => !v)
    }

    return (
      <div className="flex flex-col gap-1">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          value={value}
          leftIcon={<HiLockClosed size={16} />}
          rightIcon={
            <button
              type="button"
              onClick={toggle}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1
                         focus:outline-none focus-visible:text-cyan-400"
              aria-label={visible ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {visible ? <HiEyeOff size={18} /> : <HiEye size={18} />}
            </button>
          }
          {...rest}
        />

        {/* Strength bar — only shown when showStrength=true and user is typing */}
        {showStrength && value.length > 0 && (
          <div className="mt-1 space-y-1">
            <div className="flex gap-1 h-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={[
                    'flex-1 rounded-full transition-all duration-300',
                    i <= strength.score ? strength.color : 'bg-white/10',
                  ].join(' ')}
                />
              ))}
            </div>
            <p
              className={[
                'text-xs transition-colors duration-200',
                strength.score <= 1 ? 'text-red-400' :
                strength.score === 2 ? 'text-yellow-400' :
                'text-green-400',
              ].join(' ')}
            >
              {strength.label}
            </p>
          </div>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput
