export interface HighlightSegment {
  readonly text: string;
  readonly match: boolean;
}

function escapeRegex(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export function splitHighlight(text: string, term: string): readonly HighlightSegment[] {
  if (!text) return [];
  const trimmed = term?.trim();
  if (!trimmed) return [{ text, match: false }];

  const regex = new RegExp(`(${escapeRegex(trimmed)})`, 'gi');
  const parts = text.split(regex);
  const segments: HighlightSegment[] = [];
  for (const part of parts) {
    if (!part) continue;
    segments.push({ text: part, match: regex.test(part) });
    regex.lastIndex = 0;
  }
  return segments;
}
