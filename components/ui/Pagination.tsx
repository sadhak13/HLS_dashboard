"use client";

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  itemLabel?: string; // e.g. "players" or "records"
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemLabel = 'items',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show (max 5 visible pages)
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);
    if (currentPage > 3) pages.push('...');

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);

    return pages;
  };

  const pages = getPageNumbers();

  const btnBase =
    'flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const btnInactive =
    'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700';
  const btnActive =
    'bg-green-600 text-white shadow-sm hover:bg-green-700';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      {/* Count label */}
      <p className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
        Showing <span className="font-medium text-gray-700 dark:text-gray-200">{startItem}–{endItem}</span> of{' '}
        <span className="font-medium text-gray-700 dark:text-gray-200">{totalItems}</span> {itemLabel}
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          className={`${btnBase} ${btnInactive}`}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Prev */}
        <button
          className={`${btnBase} ${btnInactive}`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        {pages.map((page, idx) =>
          page === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={page}
              className={`${btnBase} ${page === currentPage ? btnActive : btnInactive}`}
              onClick={() => onPageChange(page as number)}
            >
              {page}
            </button>
          )
        )}

        {/* Next */}
        <button
          className={`${btnBase} ${btnInactive}`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last */}
        <button
          className={`${btnBase} ${btnInactive}`}
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
