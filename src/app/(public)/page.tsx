import Link from 'next/link';
import { CheckCircle2, MessageSquareText, Send, Star, Truck } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { waLink, WA_MESSAGES } from '@/lib/whatsapp';
import { ServiceCards } from '@/components/public/ServiceCards';
import { SplashScreen } from '@/components/public/SplashScreen';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const settings = await getSettings();
  const [services, reviews] = await Promise.all([
    prisma.service.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } }),
    prisma.review.findMany({
      where: { status: 'APPROVED' },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    }),
  ]);

  const waAcademic = waLink(settings.whatsappNumber, WA_MESSAGES.visited(settings.businessName));

  return (
    <>
      <SplashScreen tagline={settings.tagline} />
      {/* Hero */}
      <section className="bg-gradient-to-b from-navy-50 via-white to-white">
        <div className="container-site py-16 text-center sm:py-24">
          <span className="badge bg-royal-50 text-royal-700 !px-4 !py-1.5">
            {settings.tagline}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
            {settings.heroHeading}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {settings.heroSubtext}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/submit-requirement" className="btn-royal w-full !px-8 !py-3.5 text-base sm:w-auto">
              <Send className="h-5 w-5" /> Submit Your Requirement
            </Link>
            <WhatsAppButton href={waAcademic} className="w-full !px-8 !py-3.5 text-base sm:w-auto" meta={{ placement: 'hero' }}>
              Chat on WhatsApp
            </WhatsAppButton>
          </div>
          <p className="mt-8 text-sm font-medium text-slate-500">{settings.footerNote}</p>
        </div>
      </section>

      {/* Services */}
      <section className="container-site py-14" id="services">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-navy-950">What Can We Help You With?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Pick a service to get started — or describe any custom requirement in your own words.
          </p>
        </div>
        <ServiceCards
          services={services.map((s) => ({
            slug: s.slug, name: s.name, shortDesc: s.shortDesc, icon: s.icon,
            startingPrice: s.startingPrice?.toString() ?? null, priceUnit: s.priceUnit,
          }))}
        />
      </section>

      {/* How it works */}
      <section className="bg-navy-50/60 py-14">
        <div className="container-site">
          <h2 className="text-center text-3xl font-bold text-navy-950">How It Works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: Send, title: '1. Tell us what you need', desc: 'Submit your requirement in plain words — attach files if you have them.' },
              { icon: MessageSquareText, title: '2. We contact you', desc: 'Our team reaches out on WhatsApp or phone with a clear quotation.' },
              { icon: Truck, title: '3. Get it done & delivered', desc: 'Collect your work or get doorstep delivery — whatever suits you.' },
            ].map((step) => (
              <div key={step.title} className="card p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-white">
                  <step.icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-navy-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tell us what you need */}
      <section className="container-site py-14">
        <div className="card overflow-hidden bg-gradient-to-br from-navy-900 to-royal-800 p-8 text-center sm:p-12">
          <h2 className="text-3xl font-bold text-white">Tell Us What You Need</h2>
          <p className="mx-auto mt-3 max-w-2xl text-navy-100">
            Need help with an assignment, lab manual, project report or printing order?
            Just explain your requirement. Our team will contact you.
          </p>
          <Link href="/submit-requirement" className="btn mt-7 bg-white px-8 py-3.5 text-base text-navy-900 hover:bg-navy-50">
            <Send className="h-5 w-5" /> Submit Your Requirement
          </Link>
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 ? (
        <section className="container-site pb-14">
          <h2 className="text-center text-3xl font-bold text-navy-950">What Students Say</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.id} className="card p-6">
                <div className="flex gap-0.5 text-amber-400" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-current' : 'text-navy-100'}`} />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-slate-600">“{r.body}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold text-navy-900">
                  {r.authorName}
                  {r.college ? <span className="block text-xs font-normal text-slate-400">{r.college}</span> : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Bulk printing strip */}
      <section className="container-site pb-16">
        <div className="card flex flex-col items-center justify-between gap-4 p-6 sm:flex-row sm:p-8">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-9 w-9 shrink-0 text-whatsapp" aria-hidden />
            <div>
              <h3 className="font-bold text-navy-900">Bulk printing for your whole class?</h3>
              <p className="text-sm text-slate-500">Get special rates for 500+ pages — notes, manuals, question banks and more.</p>
            </div>
          </div>
          <WhatsAppButton
            href={waLink(settings.whatsappNumber, WA_MESSAGES.bulkQuote())}
            eventType="bulk_whatsapp_click"
            className="shrink-0"
            meta={{ placement: 'home-bulk' }}
          >
            Get Bulk Quote
          </WhatsAppButton>
        </div>
      </section>
    </>
  );
}
