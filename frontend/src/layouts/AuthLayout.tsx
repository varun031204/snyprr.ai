import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Logo } from '../components/ui/Logo';
import loginBg from '../assets/login-bg.mp4';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">

      {/* ── Full-screen background video ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        src={loginBg}
      />

      {/* ── Dark overlay so text stays readable ── */}
      <div className="absolute inset-0 bg-black/55 z-10" />

      {/* ── Nav bar ── */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-4">
        <Link to="/" className="flex items-center">
          <Logo className="h-10 w-auto object-contain" />
        </Link>
        <ThemeToggle />
      </nav>

      {/* ── Content — floats above video ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-20">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      <footer className="relative z-20 text-center py-4 text-xs text-white/50">
        © {new Date().getFullYear()} Snyprr.ai · Predictions only. Not financial advice.
      </footer>
    </div>
  );
};
