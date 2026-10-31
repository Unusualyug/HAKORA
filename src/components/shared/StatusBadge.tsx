import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('badge', STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700')}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
