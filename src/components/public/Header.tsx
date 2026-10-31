'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { track } from './Analytics';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/submit-requirement', label: 'Submit Requirement' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
];

export function Header({ brand, tagline, waHref }: { brand: string; tagline: string; waHref: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/90 backdrop-blur">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label={`${brand} home`}>
          <Logo name={brand} tagline={tagline} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                pathname === item.href ? 'bg-navy-50 text-navy-900' : 'text-slate-600 hover:bg-navy-50 hover:text-navy-900',
              )}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('whatsapp_click', { placement: 'header' })}
            className="btn-whatsapp btn-sm ml-2 !px-4 !py-2"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
          </a>
        </nav>

        <button
          className="rounded-lg p-2 text-navy-900 hover:bg-navy-50 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-navy-100 bg-white px-4 pb-4 pt-2 md:hidden" aria-label="Mobile">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'block rounded-lg px-3 py-2.5 text-sm font-medium',
                pathname === item.href ? 'bg-navy-50 text-navy-900' : 'text-slate-600',
              )}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('whatsapp_click', { placement: 'header-mobile' })}
            className="btn-whatsapp mt-2 w-full"
          >
            <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
          </a>
        </nav>
      ) : null}
    </header>
  );
}
