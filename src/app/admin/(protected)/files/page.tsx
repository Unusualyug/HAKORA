import Link from 'next/link';
import { FileText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';
import { STORAGE_MODE } from '@/lib/storage';
import { Pagination } from '@/components/admin/Pagination';
import { SearchBox } from '@/components/admin/SearchBox';
import { DeleteAttachmentButton } from '@/components/admin/EnquiryDetailActions';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 25;

export default async function FilesPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  await requireAdmin();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = searchParams.q
    ? {
        OR: [
          { fileName: { contains: searchParams.q, mode: 'insensitive' as const } },
          { enquiry: { refNo: { contains: searchParams.q, mode: 'insensitive' as const } } },
          { enquiry: { customer: { fullName: { contains: searchParams.q, mode: 'insensitive' as const } } } },
        ],
      }
    : {};
  const [files, total] = await Promise.all([
    prisma.enquiryAttachment.findMany({
      where,
      include: { enquiry: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    prisma.enquiryAttachment.count({ where }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">File Manager</h1>
        <p className="text-sm text-slate-500">
          {total} files · storage mode: <span className="badge bg-navy-100 text-navy-800">{STORAGE_MODE === 's3' ? 'Private object storage (signed URLs)' : 'Local (dev fallback)'}</span>
        </p>
      </div>
      <SearchBox placeholder="Search by file name, enquiry ref or customer…" />
      <div className="card overflow-x-auto">
        <table className="table-admin min-w-[760px]">
          <thead><tr><th>File</th><th>Customer</th><th>Enquiry</th><th>Size</th><th>By</th><th>Uploaded</th><th></th></tr></thead>
          <tbody>
            {files.length === 0 ? (
              <tr><td colSpan={7} className="py-14 text-center text-sm text-slate-400">No files uploaded yet.</td></tr>
            ) : files.map((f) => (
              <tr key={f.id}>
                <td>
                  <a href={`/api/files/${f.id}`} target="_blank" className="flex items-center gap-2 font-medium text-royal-600 hover:underline">
                    <FileText className="h-4 w-4 shrink-0" /> {f.fileName}
                  </a>
                </td>
                <td>{f.enquiry.customer.fullName}</td>
                <td><Link href={`/admin/enquiries/${f.enquiryId}`} className="font-medium text-royal-600 hover:underline">{f.enquiry.refNo}</Link></td>
                <td className="whitespace-nowrap">{(f.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                <td className="capitalize">{f.uploadedBy}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(f.createdAt)}</td>
                <td><DeleteAttachmentButton attachmentId={f.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
