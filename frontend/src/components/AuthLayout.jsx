/**
 * AuthLayout — shared full-page layout for Login, Signup, ForgotPassword.
 * Renders animated background orbs + centred glassmorphism card.
 *
 * Props:
 *  title    : page heading
 *  subtitle : descriptive sub-heading
 *  children : form content
 *  maxWidth : Tailwind max-width class, default 'max-w-md'
 */

import React from 'react'
import { Link } from 'react-router-dom'

const Logo = () => (
  <Link to="/" className="flex items-center justify-center gap-3 group mb-2">
    <div
      className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-green-500
                 flex items-center justify-center font-bold text-gray-950
                 group-hover:scale-105 transition-transform shadow-lg shadow-cyan-500/30"
    >
      PT
    </div>
    <span className="text-lg font-bold gradient-text">பயிற்சித் தோழன் AI</span>
  </Link>
)

const AuthLayout = ({ title, subtitle, children, maxWidth = 'max-w-md' }) => {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden">

      {/* Ambient background orbs */}
      <div className="orb w-96 h-96 bg-cyan-500  top-[-10%] left-[-10%]"  aria-hidden="true" />
      <div className="orb w-80 h-80 bg-green-500 bottom-[-5%] right-[-5%]" aria-hidden="true" style={{ animationDelay: '3s' }} />
      <div className="orb w-64 h-64 bg-cyan-400  top-[60%]  left-[60%]"   aria-hidden="true" style={{ animationDelay: '1.5s' }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,229,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
        aria-hidden="true"
      />

      {/* Card */}
      <div className={`relative z-10 w-full ${maxWidth} animate-slide-up`}>
        <div className="glass-strong p-8 sm:p-10 shadow-2xl shadow-black/40">
          {/* Logo */}
          <Logo />

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>

          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
