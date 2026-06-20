import {
  normalizeForMatching,
  parsePriceAmount,
  parseCriteriaNumber,
  hasMatchingWordSet,
  hasNormalizedPhrase,
  wordsMatchLoosely,
} from '../visible-flights/visible-flight-parsers';

export {
  normalizeForMatching,
  parsePriceAmount,
  parseCriteriaNumber,
  hasMatchingWordSet,
  hasNormalizedPhrase,
  wordsMatchLoosely,
};

/**
 * Parses a rating string like "4.5 / 5", "4.5 ★", or "4.5 out of 5" to a float.
 * Returns null when no recognisable rating is found.
 */
export function parseRatingValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = String(value).match(/([0-9](?:\.[0-9])?)/);
  return m ? Number(m[1]) : null;
}

/**
 * Parses a discount string like "20% off" or "save $10" to the numeric percentage.
 * Returns null when not parseable as a percentage.
 */
export function parseDiscountPercent(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = String(value).match(/(\d+)\s*%/);
  return m ? Number(m[1]) : null;
}

/**
 * Parses a review count string like "1,234 reviews" to an integer.
 */
export function parseReviewCount(value: string | null | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, '');
  const m = normalized.match(/\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * Normalises availability to a canonical form.
 */
export function parseAvailability(
  value: string | null | undefined,
): 'in_stock' | 'out_of_stock' | null {
  const normalized = normalizeForMatching(value ?? '');
  if (!normalized) return null;
  if (/\b(?:out of stock|sold out|unavailable)\b/.test(normalized)) return 'out_of_stock';
  if (/\b(?:in stock|available|in-stock)\b/.test(normalized)) return 'in_stock';
  return null;
}
