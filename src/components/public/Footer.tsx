import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import type { SiteSettings } from "@/lib/settings";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

export function Footer({
  settings,
  services,
}: {
  settings: SiteSettings;
  services: { slug: string; name: string }[];
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 bg-navy-950 text-navy-200">
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo name={settings.businessName} tagline={settings.tagline} light />
          <p className="mt-4 text-sm leading-relaxed text-navy-300">
            {settings.footerNote}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Quick Links
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/" className="hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link href="/submit-requirement" className="hover:text-white">
                Submit Requirement
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms-and-conditions" className="hover:text-white">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="hover:text-white">
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Services
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.slice(0, 6).map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="hover:text-white">
                  {s.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/services"
                className="font-medium text-royal-300 hover:text-white"
              >
                All services →
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Contact
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>{settings.contactPhone}</li>
            <li>{settings.businessEmail}</li>
            <li>{settings.serviceArea}</li>
            <li className="pt-1">
              <a
                href={waLink(
                  settings.whatsappNumber,
                  WA_MESSAGES.academic(settings.businessName),
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg bg-[#25D366] px-4 py-2 font-semibold text-white hover:bg-[#1fb857]"
              >
                WhatsApp Us
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-800 py-5 text-center text-xs text-navy-400">
        © {year} {settings.businessName}. All rights reserved.
      </div>
    </footer>
  );
}
