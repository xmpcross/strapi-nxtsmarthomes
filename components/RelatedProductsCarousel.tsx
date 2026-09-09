'use client';

import { useEffect, useRef } from 'react';
import ProductBox from '@/components/ProductBox';
import type { CommerceProduct } from '@/lib/commerce';

/**
 * Auto-sliding strip of related products for the foot of a product page.
 *
 * Five per view on desktop, stepping down to two on tablets and one and a half
 * on phones — the half card is deliberate: a partly visible next card is what
 * tells a reader on a narrow screen that the strip scrolls at all.
 *
 * Built on native scroll with CSS snap points rather than a carousel library.
 * Swipe, trackpad, keyboard and scrollbar all keep working for free, and it
 * degrades to a plain horizontal scroller if the JavaScript never runs.
 *
 * Auto-advance pauses on hover, on touch, and while the strip has keyboard
 * focus inside it — an advance that fires mid-reach moves the target out from
 * under the pointer, and one that fires while someone is tabbing through the
 * links steals focus position. It also pauses when the strip is scrolled off
 * screen, so a page left open in a background tab is not silently looping.
 *
 * Mirrors RelatedCarousel (the editorial equivalent) rather than sharing with
 * it: that one takes posts and renders PostCard, this takes products and
 * renders ProductBox, and the only common part is the twelve lines of timer.
 */
const SLIDE_INTERVAL_MS = 4000;

export default function RelatedProductsCarousel({
  products,
}: {
  products: CommerceProduct[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };

    track.addEventListener('mouseenter', pause);
    track.addEventListener('mouseleave', resume);
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('focusin', pause);
    track.addEventListener('focusout', resume);

    // Don't animate a strip nobody can see.
    const observer = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.2 },
    );
    observer.observe(track);

    const timer = window.setInterval(() => {
      if (pausedRef.current || !visibleRef.current) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      track.scrollTo({
        left: atEnd ? 0 : track.scrollLeft + track.clientWidth,
        behavior: 'smooth',
      });
    }, SLIDE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      track.removeEventListener('mouseenter', pause);
      track.removeEventListener('mouseleave', resume);
      track.removeEventListener('touchstart', pause);
      track.removeEventListener('focusin', pause);
      track.removeEventListener('focusout', resume);
    };
  }, []);

  if (!products.length) return null;

  return (
    <div
      ref={trackRef}
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 sm:gap-6 [scrollbar-width:thin]"
      data-testid="related-products"
    >
      {products.map((p) => (
        <div
          key={p.slug}
          className="w-[66%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-4*1.5rem)/5)]"
        >
          <ProductBox product={p} variant="tile" />
        </div>
      ))}
    </div>
  );
}
