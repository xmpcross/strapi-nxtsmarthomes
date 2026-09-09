/**
 * The site's small markdown-to-HTML converter.
 *
 * Extracted from components/PostContent so server components can use it too:
 * PostContent is a client component (it wires up accordions in imported
 * WordPress markup), and product pages need the same conversion without
 * shipping that behaviour or its JavaScript to the browser.
 *
 * Deliberately not a full CommonMark implementation. It covers what the CMS
 * actually produces — h2-h4, paragraphs, ordered and unordered lists, tables,
 * horizontal rules, bold, italics and links — and nothing else. Input is escaped
 * before any inline pattern is applied, so a description cannot inject markup.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function looksLikeHtml(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

export function stripEmptyParagraphs(html: string): string {
  return html
    .replace(/<div id="more-\d+"><\/div>(?:\s*<br\s*\/?>)?/gi, "")
    .replace(/<p(?:\s[^>]*)?>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/p>/gi, "");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function isTableLine(line: string): boolean {
  return /^\|.+\|$/.test(line.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s:|\-]+\|$/.test(line.trim());
}

function tableCells(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderTable(rows: string[]): string {
  const usable = rows.filter((row) => isTableLine(row));
  if (usable.length < 2 || !isTableSeparator(usable[1])) {
    return usable.map((row) => `<p>${inlineMarkdown(row)}</p>`).join("\n");
  }

  const headers = tableCells(usable[0]);
  const bodyRows = usable.slice(2).map(tableCells).filter((cells) => cells.some(Boolean));
  const thead = `<thead><tr>${headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows.map((cells) => `<tr>${headers.map((_, index) => `<td>${inlineMarkdown(cells[index] || "")}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<div class="post-table-wrap"><table>${thead}${tbody}</table></div>`;
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: string[] = [];
  let table: string[] = [];
  let ordered = false;

  const flushList = () => {
    if (!list.length) return;
    const tag = ordered ? "ol" : "ul";
    out.push(`<${tag}>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${tag}>`);
    list = [];
  };

  const flushTable = () => {
    if (!table.length) return;
    out.push(renderTable(table));
    table = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      if (table.length) continue;
      flushList();
      continue;
    }

    if (isTableLine(line)) {
      flushList();
      table.push(line);
      continue;
    }

    flushTable();

    if (/^---+$/.test(line)) { flushList(); out.push("<hr />"); continue; }
    const h = line.match(/^(#{2,4})\s+(.+)$/);
    if (h) { flushList(); out.push(`<h${h[1].length}>${inlineMarkdown(h[2])}</h${h[1].length}>`); continue; }
    const b = line.match(/^[-*]\s+(.+)$/);
    if (b) { if (list.length && ordered) flushList(); ordered = false; list.push(b[1]); continue; }
    const n = line.match(/^\d+[.)]\s+(.+)$/);
    if (n) { if (list.length && !ordered) flushList(); ordered = true; list.push(n[1]); continue; }
    flushList();
    out.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  flushTable();
  flushList();
  return out.join("\n");
}

/**
 * A description reduced to plain prose, for meta tags and structured data.
 *
 * Those fields are read by machines and shown verbatim in search results, so
 * markup in them is not cosmetic: the raw CMS text opens with `## <name>`, which
 * was being emitted straight into meta description, OpenGraph, Twitter cards and
 * the Product JSON-LD. Strips the leading heading, then the inline syntax, and
 * collapses the line breaks that a snippet would otherwise render as gaps.
 */
export function descriptionToPlainText(description: string): string {
  return String(description || "")
    .replace(/^#{2,4}\s+.*(?:\n|$)/, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/)?[^\s)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/^\|.*\|$/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Product descriptions as HTML.
 *
 * The CMS writes them as markdown opening with an `## <product name>` heading
 * that repeats the page's own H1. That duplicate is dropped: it reads as a
 * stutter directly under the title and puts a second competing heading into the
 * document outline.
 */
export function productDescriptionHtml(description: string): string {
  const trimmed = String(description || "").trim();
  if (!trimmed) return "";
  const withoutLeadHeading = trimmed.replace(/^#{2,4}\s+.*(?:\n|$)/, "").trim();
  const source = withoutLeadHeading || trimmed;
  return stripEmptyParagraphs(looksLikeHtml(source) ? source : markdownToHtml(source));
}
