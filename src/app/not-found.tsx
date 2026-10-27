'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--color-ivory)' }}>
      <div className="max-w-md w-full bg-white border rounded-2xl p-8 shadow-sm text-center space-y-4" style={{ borderColor: 'var(--color-parchment)' }}>
        <div className="w-14 h-14 rounded-full bg-stone-100 text-forest-700 flex items-center justify-center mx-auto">
          <FileQuestion size={28} />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
          Record Not Found
        </h1>
        <p className="text-xs text-gray-500">
          The requested page or instrument record does not exist or has been archived from the Sakshya repository.
        </p>
        <div className="pt-2">
          <Link href="/dashboard" className="btn-primary text-xs inline-flex items-center gap-1.5 px-4 py-2">
            <ArrowLeft size={14} /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
