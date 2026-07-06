import React from 'react';

export function EmptyState({ 
  title, 
  description, 
  icon, 
  action 
}: { 
  title: string; 
  description: string; 
  icon?: React.ReactNode; 
  action?: React.ReactNode 
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {icon && (
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="mb-1 text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
