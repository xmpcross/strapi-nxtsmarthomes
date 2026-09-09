"use client";

import { useEffect, useRef } from "react";
import { looksLikeHtml, markdownToHtml, stripEmptyParagraphs } from "@/lib/markdown";

function normalizeContent(content: string): string {
  const trimmed = String(content || "").trim();
  const rendered = looksLikeHtml(trimmed) ? trimmed : markdownToHtml(trimmed);
  const cleaned = rendered.replace(/<script\b[^>]*type=["\x27]application\/ld\+json["\x27][^>]*>[\s\S]*?<\/script>/gi, "");
  return stripEmptyParagraphs(cleaned.replace(/nxtvitality-20/g, "fxnholdings-20").replace(/<div[^>]*cegg-card-price[\s\S]*?<\/div>\s*(?:<\/p>\s*)?(?:<\/div>\s*)?/gi, "").replace(/<div[^>]*cegg-price-disclaimer[\s\S]*?<\/div>/gi, "").replace(/<small>\s*(?:Amazon\s+)?price updated:[\s\S]*?<\/small>/gi, "").replace(/<span[^>]*cegg-price[^>]*>[\s\S]*?<\/span>/gi, "").replace(/<del[^>]*>[\s\S]*?<\/del>/gi, "").replace(/\b(?:in stock|out of stock)\b/gi, ""));
}

export default function PostContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cleanedHtml = normalizeContent(html);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLElement>(".gs-accordion-item").forEach((item) => {
      item.classList.add("gsclose");
      const title = item.querySelector<HTMLElement>(".gs-accordion-item__title");
      if (!title) return;
      title.setAttribute("role", "button");
      title.setAttribute("tabindex", "0");
      title.setAttribute("aria-expanded", "false");
      const onActivate = (e: Event) => {
        if (e instanceof KeyboardEvent && e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        item.classList.toggle("gsclose");
        title.setAttribute("aria-expanded", String(!item.classList.contains("gsclose")));
      };
      title.addEventListener("click", onActivate);
      title.addEventListener("keydown", onActivate);
      cleanups.push(() => {
        title.removeEventListener("click", onActivate);
        title.removeEventListener("keydown", onActivate);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [html]);

  return <div ref={ref} className="post-content" data-testid="post-content" dangerouslySetInnerHTML={{ __html: cleanedHtml }} />;
}
