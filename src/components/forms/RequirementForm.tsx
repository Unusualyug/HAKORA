'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CloudUpload, Loader2, X } from 'lucide-react';
import { submitEnquiry, type SubmitResult } from '@/server/actions/enquiry';
import { track } from '@/components/public/Analytics';

const MAX_FILES = 5;
const MAX_MB = 10;
const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';

export function RequirementForm({ services, preselect, brand = 'HAKORA' }: { services: string[]; preselect?: string; brand?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [needsDelivery, setNeedsDelivery] = useState(false);
  const startedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onFirstInteraction = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      track('form_start');
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) break;
      if (f.size > MAX_MB * 1024 * 1024) {
        setErrors((e) => ({ ...e, files: `"${f.name}" is larger than ${MAX_MB} MB` }));
        continue;
      }
      if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
    }
    setFiles(next);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return; // double-click guard
    setErrors({});
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    fd.delete('files');
    files.forEach((f) => fd.append('files', f));

    startTransition(async () => {
      let res: SubmitResult;
      try {
        res = await submitEnquiry(fd);
      } catch {
        setMessage('Something went wrong. Please try again or contact us on WhatsApp.');
        return;
      }
      if (res.ok) {
        track('form_submit', { ref: res.refNo });
        router.push(`/thank-you?ref=${encodeURIComponent(res.refNo)}`);
      } else {
        setErrors(res.errors);
        setMessage(res.message ?? 'Please correct the highlighted fields.');
        document.getElementById('requirement-form-top')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  };

  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs font-medium text-red-600">{errors[k]}</p> : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} onFocusCapture={onFirstInteraction} noValidate className="space-y-5">
      <div id="requirement-form-top" />
      {message ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
      ) : null}

      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fullName">Full Name <span className="text-red-500">*</span></label>
          <input id="fullName" name="fullName" className="input" placeholder="e.g. Priya Sharma" required />
          {err('fullName')}
        </div>
        <div>
          <label className="label" htmlFor="mobile">Mobile Number <span className="text-red-500">*</span></label>
          <input id="mobile" name="mobile" type="tel" inputMode="numeric" className="input" placeholder="10-digit mobile number" required />
          {err('mobile')}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="college">School / College Name <span className="text-red-500">*</span></label>
        <input id="college" name="college" className="input" placeholder="e.g. LD College of Engineering" required />
        {err('college')}
      </div>

      <div>
        <label className="label" htmlFor="description">Describe Your Requirement <span className="text-red-500">*</span></label>
        <textarea
          id="description" name="description" rows={5} required className="input resize-y"
          placeholder="Hello, I need a computer science lab manual of approximately 60 pages. I also need it printed and spiral-bound."
        />
        {err('description')}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="serviceCategory">Service Category</label>
          <select id="serviceCategory" name="serviceCategory" className="input" defaultValue={preselect ?? ''}>
            <option value="">Select a service (optional)</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="course">Course / Department</label>
          <input id="course" name="course" className="input" placeholder="e.g. B.E. Computer Engineering" />
        </div>
        <div>
          <label className="label" htmlFor="semester">Semester / Class</label>
          <input id="semester" name="semester" className="input" placeholder="e.g. Semester 5" />
        </div>
        <div>
          <label className="label" htmlFor="quantity">Quantity / Copies</label>
          <input id="quantity" name="quantity" className="input" placeholder="e.g. 2 copies, 60 pages each" />
        </div>
        <div>
          <label className="label" htmlFor="deadline">Required By (Deadline)</label>
          <input id="deadline" name="deadline" type="date" className="input" min={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="label" htmlFor="needsDelivery">Delivery Required?</label>
          <select
            id="needsDelivery" name="needsDelivery" className="input"
            value={needsDelivery ? 'yes' : 'no'}
            onChange={(e) => setNeedsDelivery(e.target.value === 'yes')}
          >
            <option value="no">No — I will collect it</option>
            <option value="yes">Yes — deliver to my address</option>
          </select>
        </div>
      </div>

      {needsDelivery ? (
        <div>
          <label className="label" htmlFor="deliveryAddress">Delivery Address</label>
          <textarea id="deliveryAddress" name="deliveryAddress" rows={2} className="input resize-y" placeholder="Hostel / home address with area and landmark" />
          {err('deliveryAddress')}
        </div>
      ) : null}

      <div>
        <span className="label">Attach Files (optional)</span>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-navy-200 bg-navy-50/50 px-4 py-7 text-center transition hover:border-royal-400 hover:bg-royal-50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <CloudUpload className="h-7 w-7 text-royal-500" aria-hidden />
          <span className="text-sm font-medium text-navy-800">Click to upload or drag &amp; drop</span>
          <span className="text-xs text-slate-500">PDF, DOC, DOCX, JPG, PNG · up to {MAX_FILES} files · {MAX_MB} MB each</span>
          <input type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        </label>
        {err('files')}
        {files.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm">
                <span className="truncate pr-3">{f.name} <span className="text-xs text-slate-400">({(f.size / 1024 / 1024).toFixed(1)} MB)</span></span>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-navy-50 p-4">
        <input id="consent" name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-navy-300 text-royal-600 focus:ring-royal-500" />
        <label htmlFor="consent" className="text-sm text-slate-600">
          I agree to the <a href="/privacy-policy" className="font-medium text-royal-600 underline" target="_blank">Privacy Policy</a> and
          consent to {brand} using the submitted information to respond to my enquiry.
        </label>
      </div>
      {err('consent')}

      <button type="submit" disabled={pending} className="btn-royal w-full !py-3.5 text-base sm:w-auto sm:min-w-[260px]">
        {pending ? (<><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</>) : 'Submit Your Requirement'}
      </button>
    </form>
  );
}
