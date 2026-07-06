"use client";

import Image from 'next/image';
import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex justify-center mb-4">
          <Image 
            src="/HLSSA_logo.png" 
            alt="HLS Soccer Academy Logo" 
            width={80} 
            height={80} 
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Hyderabad Little Stars<br/><span className="text-green-600">Soccer Academy</span>
        </h1>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
              {state.error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input type="email" name="email" className="w-full px-4 py-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="admin@academy.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input type="password" name="password" className="w-full px-4 py-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={isPending} className="w-full px-4 py-2 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex justify-center items-center">
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
