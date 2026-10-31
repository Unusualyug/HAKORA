'use client';

import { MessageCircle } from 'lucide-react';
import { track } from './Analytics';
import { cn } from '@/lib/utils';

export function WhatsAppButton({
  href, children, variant = 'whatsapp', eventType = 'whatsapp_click', className, meta,
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'whatsapp' | 'outline';
  eventType?: 'whatsapp_click' | 'bulk_whatsapp_click';
  className?: string;
  meta?: Record<string, unknown>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(eventType, meta)}
      className={cn(variant === 'whatsapp' ? 'btn-whatsapp' : 'btn-outline', className)}
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {children}
    </a>
  );
}
