"use client";

import Image from 'next/image';
import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      {/* Background pattern/texture */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

      {/* Decorative ISO elements - Enhanced and more prominent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Left side geometric shapes */}
        <div className="absolute top-20 left-10 w-48 h-48 border-2 border-green-500/30 rounded-2xl rotate-12 transform-gpu"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 border-2 border-green-400/40 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 left-1/4 w-24 h-24 bg-green-500/10 rounded-2xl -rotate-12"></div>

        {/* Diagonal lines and stripes - more visible */}
        <div className="absolute top-1/4 left-1/3 w-1 h-40 bg-gradient-to-b from-green-500/40 to-transparent rotate-45"></div>
        <div className="absolute top-1/4 left-1/3 ml-8 w-1 h-32 bg-gradient-to-b from-green-400/30 to-transparent rotate-45"></div>
        <div className="absolute bottom-1/3 left-1/4 w-40 h-1 bg-gradient-to-r from-green-500/40 to-transparent"></div>
        <div className="absolute top-1/2 left-10 w-1 h-28 bg-green-400/30 -rotate-12"></div>

        {/* Right side decorative elements */}
        <div className="absolute top-1/4 right-20 w-40 h-40 border-2 border-green-400/30 rounded-2xl rotate-45"></div>
        <div className="absolute top-20 right-1/3 w-28 h-28 border-2 border-green-500/40 rounded-full"></div>
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 border border-green-500/30 rotate-12"></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-48 bg-gradient-to-b from-green-400/40 to-transparent -rotate-12"></div>
        <div className="absolute bottom-1/4 right-1/3 w-48 h-1 bg-gradient-to-l from-green-400/40 to-transparent rotate-12"></div>

        {/* Corner accents */}
        <div className="absolute top-10 left-5 w-20 h-20 border-l-2 border-t-2 border-green-400/40"></div>
        <div className="absolute bottom-10 left-5 w-20 h-20 border-l-2 border-b-2 border-green-400/40"></div>
        <div className="absolute top-10 right-5 w-20 h-20 border-r-2 border-t-2 border-green-400/40"></div>
      </div>

      {/* Right side - Illustration as background (Desktop only) */}
      <div className="hidden lg:block absolute inset-0 right-0 w-1/2 ml-auto">
        <div className="relative w-full h-full">
          {/* Gradient blend from left (fully blended) to right (visible) */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/70 via-30% to-transparent to-60% z-10"></div>

          {/* Image - more visible now */}
          <div className="relative w-full h-full">
            <Image
              src="/login_page.png"
              alt="Soccer Player"
              fill
              className="object-cover object-center"
              priority
            />
          </div>

          {/* Subtle glow overlay on the right edge */}
          <div className="absolute inset-0 bg-gradient-to-l from-blue-500/5 via-transparent to-transparent z-20"></div>

          {/* Top and bottom fade for smooth integration */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/60 z-10"></div>
        </div>
      </div>

      {/* Left side - Login Form */}
      <div className="relative z-30 flex items-center justify-center w-full lg:w-1/2 p-4 sm:p-6 md:p-8 min-h-screen">
        <div className="w-full max-w-md">
          {/* Glassmorphism Card */}
          <div className="backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
            {/* Logo and Title */}
            <div className="text-center space-y-4 sm:space-y-5">
              {/* Enhanced Logo Treatment */}
              <div className="flex justify-center">
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
                  {/* Layered white glow effects */}
                  <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
                  <div className="absolute inset-0 bg-white/15 blur-xl rounded-full"></div>

                  {/* Logo container - perfectly circular */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 flex items-center justify-center rounded-full border border-white/20 backdrop-blur-sm overflow-hidden">
                    <Image
                      src="/HLS_logo.png"
                      alt="HLS Soccer Academy Logo"
                      width={100}
                      height={100}
                      className="relative object-contain w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                  Welcome back
                </h1>
                <p className="text-sm sm:text-base text-gray-400">
                  Hyderabad Little Stars
                </p>
                <p className="text-base sm:text-lg font-semibold text-green-500">
                  Soccer Academy
                </p>
              </div>
            </div>

            {/* Form */}
            <form action={formAction} className="space-y-4 sm:space-y-5">
              {state?.error && (
                <div className="p-3 sm:p-4 text-xs sm:text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
                  {state.error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 focus:bg-white/[0.08] transition-all backdrop-blur-sm"
                  placeholder="admin@academy.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-3 sm:px-4 py-3 sm:py-3.5 text-sm sm:text-base bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 focus:bg-white/[0.08] transition-all backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full px-4 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-100 flex justify-center items-center"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Additional Info */}
            <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4 border-t border-white/10">
              <p className="text-xs sm:text-sm text-center text-gray-400">
                Don&apos;t have an account?{' '}
                <span className="text-green-500 font-medium">Contact the admin</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 sm:mt-8 text-center space-y-2">
            <p className="text-[10px] sm:text-xs text-gray-500 px-4">
              © {new Date().getFullYear()} Hyderabad Little Stars Soccer Academy. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-[10px] sm:text-xs px-4">
              <a href="#" className="text-gray-500 hover:text-green-500 transition-colors">
                Privacy Policy
              </a>
              <span className="text-gray-700">•</span>
              <a href="#" className="text-gray-500 hover:text-green-500 transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
