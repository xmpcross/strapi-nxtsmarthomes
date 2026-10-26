'use client';

import { useEffect } from 'react';
import type { ConsentValue } from '@/components/CookieConsent';

/**
 * Relays a cookie-banner choice made on this page to GA4 as a Consent Mode update.
 *
 * The gtag loader and its denied defaults are emitted server-side in app/layout.tsx (so Google's tag check
 * sees them in the HTML), and that inline script already grants a returning visitor who accepted earlier.
 * This only covers the moment a visitor clicks the banner: CookieConsent dispatches `cookie-consent`.
 * "accepted" grants analytics and advertising storage; "essential" keeps everything denied.
 */
export default function GoogleAnalytics() {
  useEffect(() => {
    const onChoice = (e: Event) => {
      const v = (e as CustomEvent<ConsentValue>).detail;
      const s = v === 'accepted' ? 'granted' : 'denied';
      // gtag() queues on dataLayer, so pushing directly works even before the library has loaded
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push(['consent', 'update', {
        analytics_storage: s, ad_storage: s, ad_user_data: s, ad_personalization: s,
      }]);
    };
    window.addEventListener('cookie-consent', onChoice);
    return () => window.removeEventListener('cookie-consent', onChoice);
  }, []);
  return null;
}
