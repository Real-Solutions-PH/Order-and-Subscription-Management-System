import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusClassMap: Record<string, string> = {
  active:     'bg-success-light text-emerald-800',
  delivered:  'bg-success-light text-emerald-800',
  paid:       'bg-success-light text-emerald-800',

  paused:     'bg-warning-light text-warning-dark',
  pending:    'bg-warning-light text-warning-dark',
  preparing:  'bg-warning-light text-warning-dark',

  cancelled:  'bg-error-light text-error-900',
  failed:     'bg-error-light text-error-900',
  churned:    'bg-error-light text-error-900',

  new:        'bg-info-light text-info-800',
  info:       'bg-info-light text-info-800',
  ready:      'bg-info-light text-info-800',
  delivering: 'bg-info-light text-info-800',
};

const defaultClasses = 'bg-muted text-gray-700';

export default function StatusBadge({ status, size = 'md' }: Readonly<StatusBadgeProps>) {
  const colorClasses = statusClassMap[status.toLowerCase()] ?? defaultClasses;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize ${sizeClasses} ${colorClasses}`}
    >
      {status}
    </span>
  );
}
