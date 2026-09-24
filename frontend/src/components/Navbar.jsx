/**
 * Navbar — top navigation bar with logo and auth links.
 * Used on the Landing page and Dashboard.
 *
 * Props:
 *  variant : 'landing' | 'dashboard'
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HiMenuAlt3, HiX } from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import Button from './Button'

const Logo = () => (
  <Link to="/" className="flex items-center gap-3 group" aria-label="Home">
    {/* SVG icon */}
    <div
      className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-green-500
                 flex items-center justify-center font-bold text-gray-950 text-sm
                 group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/20"
    >
      PT
    </div>
    <div className="flex flex-col leading-tight">
      <span className="text-sm font-bold gradient-text">பயிற்சித் தோழன்</span>
      <span className="text-[10px] text-gray-500 tracking-widest uppercase">AI Platform</span>
    </div>
  </Link>
)

const Navbar = ({ variant = 'landing' }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Add background when scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav
      className={[
        'fixed top-0 inset-x-0 z-40 transition-all duration-300',
        scrolled || menuOpen
          ? 'bg-gray-950/80 backdrop-blur-xl border-b border-white/5 shadow-lg'
          : 'bg-transparent',
      ].join(' ')}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-3">
          {variant === 'dashboard' && user ? (
            <>
              <span className="text-sm text-gray-400">
                Welcome,{' '}
                <span className="text-cyan-400 font-medium">
                  {user.full_name.split(' ')[0]}
                </span>
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/signup')}
              >
                Create Account
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-300 hover:text-white p-2 rounded-lg
                     hover:bg-white/5 transition-colors"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <HiX size={22} /> : <HiMenuAlt3 size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-t border-white/5 px-4 py-4 flex flex-col gap-3 animate-fade-in">
          {variant === 'dashboard' && user ? (
            <>
              <p className="text-sm text-gray-400 px-2">
                Signed in as <span className="text-cyan-400">{user.full_name}</span>
              </p>
              <Button variant="outline" fullWidth onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => { navigate('/login'); setMenuOpen(false) }}
              >
                Login
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => { navigate('/signup'); setMenuOpen(false) }}
              >
                Create Account
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
