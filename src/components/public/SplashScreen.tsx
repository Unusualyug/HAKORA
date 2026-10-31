'use client';

import { useEffect, useState } from 'react';

const SEEN_KEY = 'hakora-splash-seen';
/** Total time the splash stays before the exit slide (ms) — keep in sync with globals.css */
const EXIT_AT = 2300;
const REMOVE_AT = 3200;

export function SplashScreen({ tagline }: { tagline: string }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* private mode */ }
    if (seen) { setGone(true); return; }

    document.documentElement.classList.add('hk-splash-lock');
    const t = setTimeout(() => {
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
      setGone(true);
      document.documentElement.classList.remove('hk-splash-lock');
    }, REMOVE_AT);
    const unlock = setTimeout(() => document.documentElement.classList.remove('hk-splash-lock'), EXIT_AT);
    return () => { clearTimeout(t); clearTimeout(unlock); document.documentElement.classList.remove('hk-splash-lock'); };
  }, []);

  if (gone) return null;

  return (
    <>
      {/* Runs before first paint: if the splash was already shown this session, never flash it again. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem('${SEEN_KEY}')==='1')document.documentElement.classList.add('hk-splash-seen')}catch(e){}`,
        }}
      />
      <div id="hakora-splash" aria-hidden="true">
        <div className="hk-splash-inner">
          {/* eslint-disable-next-line @next/next/no-img-element -- splash brand image, deliberately unoptimized & preloaded */}
          <img
            src="/brand/hakora-logo.png"
            alt=""
            className="hk-splash-logo"
            width={1183}
            height={787}
            // @ts-expect-error -- valid HTML attribute, typed in newer React only
            fetchpriority="high"
            draggable={false}
          />
          <p className="hk-splash-tagline">{tagline}</p>
          <div className="hk-splash-bar"><span /></div>
        </div>
        <div className="hk-splash-curtain" />
      </div>
    </>
  );
}
