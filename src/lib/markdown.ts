// Front matter handling for the editor. Only fix documents have front matter
// (parent: <id>); the editor edits the body, the block is re-attached verbatim.

export interface SplitDoc {
  front: string | null; // raw block including the --- lines and trailing blank line
  body: string;
}

export function splitFrontMatter(doc: string): SplitDoc {
  const norm = doc.replace(/\r\n/g, "\n");
  if (!norm.startsWith("---\n")) return { front: null, body: doc };
  const end = norm.indexOf("\n---", 4);
  if (end < 0) return { front: null, body: doc };
  let close = end + 4;
  if (norm[close] === "\n") close++;
  let rest = norm.slice(close);
  let sep = "";
  while (rest.startsWith("\n")) {
    sep += "\n";
    rest = rest.slice(1);
  }
  return { front: norm.slice(0, close) + sep, body: rest };
}

export function joinFrontMatter(front: string | null, body: string): string {
  return front ? front + body : body;
}

export function frontMatterValue(front: string | null, key: string): string | null {
  if (!front) return null;
  for (const line of front.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0 && line.slice(0, i).trim() === key) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

/** Ensures the document ends with exactly one newline, like the server-side templates. */
export function normalizeEnding(s: string): string {
  return s.replace(/\s+$/, "") + "\n";
}

/** Stable remark-stringify options: the same document always serializes the same way,
 * so opening and saving without edits never produces a noisy diff (tech spec §14). */
export const STRINGIFY_OPTIONS = {
  bullet: "-",
  bulletOther: "*",
  bulletOrdered: ".",
  emphasis: "_",
  strong: "*",
  fence: "`",
  fences: true,
  rule: "-",
  ruleRepetition: 3,
  listItemIndent: "one",
  setext: false,
  closeAtx: false,
  incrementListMarker: true,
  tightDefinitions: true,
} as const;

/** Rules templates use <placeholders> ("<feature title>"). CommonMark would parse
 * them as raw HTML, so the rules editor loads them as escaped text and restores
 * them on save. Code spans and fences are left alone. */
export function protectPlaceholders(md: string): string {
  return mapOutsideCode(md, (s) => s.replace(/<(?=[^<>\n]+>)/g, "\\<"));
}

export function restorePlaceholders(md: string): string {
  return mapOutsideCode(md, (s) => s.replace(/\\</g, "<"));
}

function mapOutsideCode(md: string, fn: (s: string) => string): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      return line.split(/(`[^`]*`)/).map((part, i) => (i % 2 ? part : fn(part))).join("");
    })
    .join("\n");
}
