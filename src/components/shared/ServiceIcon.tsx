import {
  FlaskConical, PenLine, FolderKanban, FileSearch, ClipboardList, NotebookPen,
  BookOpen, Printer, Layers, Copy, FileStack, Sparkles, FileText, GraduationCap,
  Package, Truck, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  FlaskConical, PenLine, FolderKanban, FileSearch, ClipboardList, NotebookPen,
  BookOpen, Printer, Layers, Copy, FileStack, Sparkles, FileText, GraduationCap,
  Package, Truck,
};

export const SERVICE_ICON_NAMES = Object.keys(ICONS);

export function ServiceIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon className={className} aria-hidden />;
}
