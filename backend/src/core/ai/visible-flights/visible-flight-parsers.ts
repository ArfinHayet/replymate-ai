export function normalizeForMatching(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseRefundability(
  value: string | null | undefined,
): 'refundable' | 'non-refundable' | null {
  const normalized = normalizeForMatching(value);
  if (!normalized) return null;
  if (/\bnon\s?refundable\b/.test(normalized)) return 'non-refundable';
  if (/\brefundable\b/.test(normalized)) return 'refundable';
  return null;
}

export function hasNormalizedPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  return new RegExp(`(?:^| )${escapeRegExp(phrase)}(?: |$)`).test(text);
}

export function hasMatchingWordSet(text: string, phrase: string): boolean {
  const textWords = text.split(' ').filter((word) => word.length >= 2);
  const phraseWords = phrase.split(' ').filter((word) => word.length >= 2);

  if (phraseWords.length === 0) return false;

  return phraseWords.every((phraseWord) =>
    textWords.some((textWord) => wordsMatchLoosely(textWord, phraseWord)),
  );
}

export function parsePriceAmount(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.replace(/,/g, '');
  const currency = 'USD|BDT|EUR|GBP|AED|SAR|INR|NPR|\\u09F3|\\$|\\u20AC|\\u00A3';
  const patterns = [
    new RegExp(`(?:${currency})\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i'),
    new RegExp(`([0-9]+(?:\\.[0-9]+)?)\\s*(?:${currency})`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

export function parseCriteriaNumber(value: string | number | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase().replace(/,/g, '');
  const compact = normalized.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (compact) return Number(compact[1]) * 1000;

  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) return parsed;

  return parsePriceAmount(normalized) ?? parseStandaloneAmount(normalized);
}

export function parseStandaloneAmount(value: string): number | null {
  const matches = Array.from(value.replace(/,/g, '').matchAll(/\b\d+(?:\.\d+)?\b/g))
    .map((match) => Number(match[0]))
    .filter((amount) => Number.isFinite(amount));

  return matches.length > 0 ? Math.max(...matches) : null;
}

export function parseDurationMinutes(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  const hourMinute = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes))?/,
  );
  if (hourMinute) {
    return Math.round(Number(hourMinute[1]) * 60 + Number(hourMinute[2] ?? 0));
  }

  const minutes = normalized.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (minutes) return Number(minutes[1]);

  return null;
}

export function parseTimeMinutes(value: string | null | undefined, occurrence = 0): number | null {
  if (!value) return null;

  const matches = Array.from(String(value).matchAll(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g));
  const match = matches[occurrence];
  if (!match) return null;

  const [hours, minutes] = match[0].split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

export function parseBaggageWeight(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  const kgMatches = Array.from(normalized.matchAll(/(\d+(?:\.\d+)?)\s*kg\b/g));
  if (kgMatches.length > 0) {
    return Math.max(...kgMatches.map((match) => Number(match[1])));
  }

  const lbMatches = Array.from(
    normalized.matchAll(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\b/g),
  );
  if (lbMatches.length > 0) {
    return Math.max(...lbMatches.map((match) => Number(match[1]) * 0.453592));
  }

  return null;
}

export function parseStopsCount(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (/\b(?:non[-\s]?stop|direct|no\s+stops?)\b/.test(normalized)) return 0;
  if (/\bzero\s+stops?\b/.test(normalized)) return 0;

  const stopMatch = normalized.match(/\b(\d+)\s+stops?\b/);
  if (stopMatch) return Number(stopMatch[1]);

  const layoverMatch = normalized.match(/\b(\d+)\s+layovers?\b/);
  if (layoverMatch) return Number(layoverMatch[1]);

  return null;
}

function wordsMatchLoosely(textWord: string, phraseWord: string): boolean {
  if (textWord === phraseWord) return true;
  if (textWord.length >= 3 && phraseWord.startsWith(textWord)) return true;
  if (phraseWord.length >= 3 && textWord.startsWith(phraseWord)) return true;
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
