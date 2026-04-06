import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusColorMap: Record<string, { bg: string; text: string }> = {
  active:     { bg: '#D1FAE5', text: '#065F46' },
  delivered:  { bg: '#D1FAE5', text: '#065F46' },
  paid:       { bg: '#D1FAE5', text: '#065F46' },

  paused:     { bg: '#FEF3C7', text: '#92400E' },
  pending:    { bg: '#FEF3C7', text: '#92400E' },
  preparing:  { bg: '#FEF3C7', text: '#92400E' },

  cancelled:  { bg: '#FEE2E2', text: '#991B1B' },
  failed:     { bg: '#FEE2E2', text: '#991B1B' },
  churned:    { bg: '#FEE2E2', text: '#991B1B' },

  new:        { bg: '#DBEAFE', text: '#1E40AF' },
  info:       { bg: '#DBEAFE', text: '#1E40AF' },
  ready:      { bg: '#DBEAFE', text: '#1E40AF' },
  delivering: { bg: '#DBEAFE', text: '#1E40AF' },
};

const defaultColors = { bg: '#F3F4F6', text: '#374151' };

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = statusColorMap[status.toLowerCase()] ?? defaultColors;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize ${sizeClasses} ${colorClasses}`}
    >
      {status}
    </span>
  );
}
