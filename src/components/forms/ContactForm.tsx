'use client';

import { useState, useTransition } from 'react';
import { Loader2, Send } from 'lucide-react';
import { submitContactMessage } from '@/server/actions/enquiry';

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await submitContactMessage(fd);
      setResult(res);
      if (res.ok) form.reset();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {result ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {result.ok ? 'Message sent! We will get back to you soon.' : result.message}
        </div>
      ) : null}
      <div>
        <label className="label" htmlFor="c-name">Your Name</label>
        <input id="c-name" name="name" className="input" required placeholder="Full name" />
      </div>
      <div>
        <label className="label" htmlFor="c-mobile">Mobile Number</label>
        <input id="c-mobile" name="mobile" type="tel" className="input" required placeholder="10-digit mobile number" />
      </div>
      <div>
        <label className="label" htmlFor="c-message">Message</label>
        <textarea id="c-message" name="message" rows={4} className="input resize-y" required placeholder="How can we help you?" />
      </div>
      <button type="submit" disabled={pending} className="btn-royal w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Message
      </button>
    </form>
  );
}
