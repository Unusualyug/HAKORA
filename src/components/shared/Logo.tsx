import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ name, tagline, light, className }: { name: string; tagline?: string; light?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', light ? 'bg-white/10' : 'bg-navy-900')}>
        <GraduationCap className="h-6 w-6 text-white" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className={cn('block text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-navy-900')}>
          {name}
        </span>
        {tagline ? (
          <span className={cn('block text-[11px] font-medium', light ? 'text-navy-200' : 'text-slate-500')}>{tagline}</span>
        ) : null}
      </span>
    </span>
  );
}
