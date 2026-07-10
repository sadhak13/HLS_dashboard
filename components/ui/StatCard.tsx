"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  iconColor?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  iconColor = "text-green-500",
  className
}: StatCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/10 p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]",
      className
    )}>
      {/* Gradient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative space-y-3">
        {/* Icon */}
        <div className="flex items-center justify-between">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm",
            iconColor
          )}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg backdrop-blur-sm",
              trend.isPositive
                ? "text-green-400 bg-green-500/10 border border-green-500/20"
                : "text-red-400 bg-red-500/10 border border-red-500/20"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1">
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/0 via-green-500/50 to-green-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
}
