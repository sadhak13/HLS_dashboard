"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  title?: string;
}

export function GlassCard({ children, className, header, title }: GlassCardProps) {
  return (
    <div className={cn(
      "rounded-2xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-2xl overflow-hidden",
      className
    )}>
      {(header || title) && (
        <div className="px-6 py-4 border-b border-white/10">
          {header || (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
