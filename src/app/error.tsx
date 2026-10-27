'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Sakshya Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-ivory)' }}>
      <div className="max-w-md w-full bg-white border rounded-2xl p-8 shadow-sm text-center space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
          Application Error
        </h1>
        <p className="text-xs text-gray-500">
          An unexpected condition occurred while processing this transaction. The demo state remains safe in local storage.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn-primary text-xs inline-flex items-center gap-1.5 px-4 py-2"
          >
            <RefreshCw size={14} /> Retry Operation
          </button>
          <Link href="/dashboard" className="btn-secondary text-xs inline-flex items-center gap-1.5 px-4 py-2">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
