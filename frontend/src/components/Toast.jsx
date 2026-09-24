/**
 * Toast utility — thin wrapper around react-hot-toast.
 *
 * Usage:
 *   import toast from '../components/Toast'
 *   toast.success('Signed in!')
 *   toast.error('Invalid credentials')
 *   toast.info('Check your email')
 *   toast.loading('Please wait…')
 *   toast.dismiss()
 */

import { toast as hotToast } from 'react-hot-toast'

const baseStyle = {
  background: 'rgba(15, 23, 42, 0.97)',
  color: '#fff',
  border: '1px solid rgba(0, 229, 255, 0.15)',
  backdropFilter: 'blur(12px)',
  borderRadius: '12px',
  fontSize: '14px',
  padding: '12px 16px',
  maxWidth: '360px',
}

const toast = {
  success: (msg, opts = {}) =>
    hotToast.success(msg, {
      style: { ...baseStyle, borderColor: 'rgba(0, 200, 83, 0.25)' },
      iconTheme: { primary: '#00C853', secondary: '#fff' },
      ...opts,
    }),

  error: (msg, opts = {}) =>
    hotToast.error(msg, {
      style: { ...baseStyle, borderColor: 'rgba(239, 68, 68, 0.25)' },
      iconTheme: { primary: '#ef4444', secondary: '#fff' },
      duration: 5000,
      ...opts,
    }),

  info: (msg, opts = {}) =>
    hotToast(msg, {
      style: { ...baseStyle, borderColor: 'rgba(0, 229, 255, 0.25)' },
      icon: 'ℹ️',
      ...opts,
    }),

  loading: (msg, opts = {}) =>
    hotToast.loading(msg, {
      style: { ...baseStyle },
      ...opts,
    }),

  dismiss: hotToast.dismiss,

  promise: hotToast.promise,
}

export default toast
