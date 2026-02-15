'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

const PASSCODE = 'mohamed@2026';
const STORAGE_KEY = 'sasa_unlocked';

export default function LockScreen({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if already unlocked (persists for browser session)
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setUnlocked(true);
    }
    setChecking(false);
  }, []);

  // Auto-focus the input
  useEffect(() => {
    if (!unlocked && !checking && inputRef.current) {
      inputRef.current.focus();
    }
  }, [unlocked, checking]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === PASSCODE) {
      sessionStorage.setItem(STORAGE_KEY, 'true');
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
    }
  }

  // Don't flash the lock screen if already unlocked
  if (checking) {
    return (
      <div className="min-h-screen bg-navy-700 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-navy-400 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-700 via-navy-600 to-navy-700 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-sm transition-transform ${shake ? 'animate-shake' : ''}`}
      >
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
            <Image
              src="/images/logo/sasa-logo-color.png"
              alt="SASA"
              width={60}
              height={20}
              className="brightness-0 invert"
            />
          </div>
          <h1 className="text-white text-xl font-bold tracking-tight">SASA Worldwide</h1>
          <p className="text-navy-300 text-sm mt-1">Sales Leaderboard</p>
        </div>

        {/* Lock card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          {/* Lock icon */}
          <div className="w-14 h-14 mx-auto mb-4 bg-navy-50 rounded-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#002E59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h2 className="text-center text-navy-700 font-bold text-lg mb-1">Enter Password</h2>
          <p className="text-center text-gray-400 text-xs mb-5">Authorized personnel only</p>

          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="Password"
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-center text-lg font-medium tracking-widest outline-none transition-all ${
                  error
                    ? 'border-red-400 bg-red-50 text-red-600 placeholder-red-300'
                    : 'border-gray-200 bg-gray-50 text-navy-700 placeholder-gray-400 focus:border-navy-500 focus:bg-white'
                }`}
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center mt-2 font-medium">
                Incorrect password. Try again.
              </p>
            )}

            <button
              type="submit"
              disabled={!password}
              className="w-full mt-4 py-3.5 bg-navy-600 text-white rounded-xl font-semibold text-sm transition-all hover:bg-navy-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-navy"
            >
              Unlock
            </button>
          </form>
        </div>

        <p className="text-center text-navy-400 text-[10px] mt-6">
          SASA Worldwide &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
