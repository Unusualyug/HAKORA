'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Inbox, Users, ShoppingCart, Printer, FolderOpen, Truck,
  Wrench, BarChart3, Star, Bell, Settings, LogOut, Menu, X, ExternalLink,
  FileSpreadsheet, IndianRupee,
} from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { adminLogout } from '@/server/actions/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/enquiries', label: 'Enquiries', icon: Inbox },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/quotations', label: 'Quotations', icon: FileSpreadsheet },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/payments', label: 'Payments', icon: IndianRupee },
  { href: '/admin/printing', label: 'Printing Management', icon: Printer },
  { href: '/admin/files', label: 'File Manager', icon: FolderOpen },
  { href: '/admin/deliveries', label: 'Deliveries', icon: Truck },
  { href: '/admin/services', label: 'Services', icon: Wrench },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ brand, adminName, unread }: { brand: string; adminName: string; unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Admin">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-royal-600 text-white' : 'text-navy-200 hover:bg-navy-800 hover:text-white',
            )}
          >
            <item.icon className="h-4.5 w-4.5 h-5 w-5 shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.label === 'Notifications' && unread > 0 ? (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unread}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-navy-800 p-3">
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="truncate text-xs text-navy-300">{adminName}</span>
        <a href="/" target="_blank" className="text-navy-400 hover:text-white" title="View website">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <form action={adminLogout}>
        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-300 hover:bg-navy-800 hover:text-white">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-navy-800 bg-navy-950 px-4 py-3 lg:hidden">
        <Link href="/admin"><Logo name={brand} light /></Link>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-white hover:bg-navy-800" aria-label="Toggle admin menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[57px] bottom-0 flex w-72 flex-col bg-navy-950">
            {nav}
            {footer}
          </div>
        </div>
      ) : null}

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-950 lg:flex">
        <div className="border-b border-navy-800 px-5 py-4">
          <Link href="/admin"><Logo name={brand} tagline="Admin Dashboard" light /></Link>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
