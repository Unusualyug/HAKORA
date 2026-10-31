import { requireAdmin } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { ReviewManager } from '@/components/admin/ReviewManager';

export const dynamic = 'force-dynamic';

export default async function ReviewsAdminPage() {
  await requireAdmin();
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">Reviews</h1>
        <p className="text-sm text-slate-500">Only approved reviews appear on the public website. Never publish fake reviews.</p>
      </div>
      <ReviewManager reviews={reviews.map((r) => ({
        id: r.id, authorName: r.authorName, college: r.college ?? '', rating: r.rating,
        body: r.body, status: r.status, isFeatured: r.isFeatured, createdAt: r.createdAt.toISOString(),
      }))} />
    </div>
  );
}
