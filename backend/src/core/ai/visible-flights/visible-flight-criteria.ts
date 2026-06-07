import { z } from 'zod';
import type { FlightListContext } from '../../../features/chat/flight-list-context';
import {
  hasMatchingWordSet,
  hasNormalizedPhrase,
  normalizeForMatching,
  parseBaggageWeight,
  parseCriteriaNumber,
  parseDurationMinutes,
  parsePriceAmount,
  parseRefundability,
  parseStopsCount,
  parseTimeMinutes,
} from './visible-flight-parsers';

export const flightListFilterCriteriaSchema = z.object({
  field: z.enum([
    'airline',
    'price',
    'stops',
    'refundability',
    'duration',
    'baggage',
    'departure',
    'arrival',
    'origin',
    'destination',
    'rawText',
  ]),
  operator: z.enum([
    'contains',
    'equals',
    'not_equals',
    'less_than',
    'less_than_or_equal',
    'greater_than',
    'greater_than_or_equal',
    'between',
  ]),
  value: z.union([z.string(), z.number()]).optional().describe(
    'Comparison value for single-value filters. Compact values like 10k are allowed.',
  ),
  min: z.union([z.string(), z.number()]).optional().describe(
    'Minimum value for between filters. Use numbers for parsed money, minutes, kilograms, stops, or minutes after midnight.',
  ),
  max: z.union([z.string(), z.number()]).optional().describe(
    'Maximum value for between filters. Use numbers for parsed money, minutes, kilograms, stops, or minutes after midnight.',
  ),
  label: z.string().optional().describe('Human-readable label for this filter.'),
});

export const flightListCriteriaSchema = z.object({
  filters: z.array(flightListFilterCriteriaSchema).optional(),
  sort: z.enum([
    'price_asc',
    'price_desc',
    'duration_asc',
    'duration_desc',
    'baggage_desc',
    'baggage_asc',
    'departure_asc',
    'departure_desc',
    'arrival_asc',
    'arrival_desc',
    'stops_asc',
    'stops_desc',
    'none',
  ]).optional(),
  selection: z.enum(['single_best', 'all_matches']).optional(),
  label: z.string().optional().describe('Short label for card highlighting.'),
}).optional();

export type FlightListCriteria = NonNullable<z.infer<typeof flightListCriteriaSchema>>;
export type FlightListFilterCriteria = NonNullable<FlightListCriteria['filters']>[number];
export type FlightListSort = NonNullable<FlightListCriteria['sort']>;

type VisibleFlight = FlightListContext['flights'][number];
type CriterionMatch = 'match' | 'no_match' | 'unavailable';

export function hasFlightListCriteria(
  criteria: FlightListCriteria | null | undefined,
): criteria is FlightListCriteria {
  return Boolean(
    criteria &&
      ((criteria.filters?.length ?? 0) > 0 ||
        (criteria.sort && criteria.sort !== 'none') ||
        criteria.selection ||
        criteria.label?.trim()),
  );
}

export function buildCriteriaLabel(criteria: FlightListCriteria): string {
  const explicitLabel = criteria.label?.trim();
  if (explicitLabel) return explicitLabel;

  const filterLabels = (criteria.filters ?? [])
    .map((filter) => filter.label?.trim() || buildFilterLabel(filter))
    .filter(Boolean);

  if (filterLabels.length > 0) return filterLabels.join(', ');
  if (criteria.sort && criteria.sort !== 'none') return buildSortLabel(criteria.sort);
  return 'matching flights';
}

export function buildSortLabel(sort: FlightListSort): string {
  const labels: Record<FlightListSort, string> = {
    price_asc: 'cheapest flight',
    price_desc: 'highest fare flight',
    duration_asc: 'fastest flight',
    duration_desc: 'longest duration flight',
    baggage_desc: 'best baggage option',
    baggage_asc: 'lowest baggage option',
    departure_asc: 'earliest departure',
    departure_desc: 'latest departure',
    arrival_asc: 'earliest arrival',
    arrival_desc: 'latest arrival',
    stops_asc: 'fewest stops',
    stops_desc: 'most stops',
    none: 'matching flights',
  };
  return labels[sort];
}

export function applyVisibleFlightCriteria(
  flights: VisibleFlight[],
  filters: FlightListFilterCriteria[],
): { matches: VisibleFlight[]; unavailableLabels: string[] } {
  if (filters.length === 0) return { matches: flights, unavailableLabels: [] };

  const outcomes = filters.map((filter) => ({
    filter,
    statuses: flights.map((flight) => matchFlightCriterion(flight, filter)),
  }));
  const unavailableLabels = outcomes
    .filter((outcome) => outcome.statuses.every((status) => status === 'unavailable'))
    .map((outcome) => outcome.filter.label?.trim() || buildFilterLabel(outcome.filter));

  if (unavailableLabels.length > 0) {
    return { matches: [], unavailableLabels };
  }

  return {
    matches: flights.filter((_, index) =>
      outcomes.every((outcome) => outcome.statuses[index] === 'match'),
    ),
    unavailableLabels: [],
  };
}

export function rankFlightsByCriteria(
  flights: VisibleFlight[],
  sort: FlightListSort | undefined,
): VisibleFlight[] {
  if (!sort || sort === 'none') return [];

  switch (sort) {
    case 'price_asc':
      return rankFlightsByPrice(flights);
    case 'price_desc':
      return rankFlightsByNumber(flights, (flight) => parsePriceAmount(flight.price ?? flight.rawText), 'desc');
    case 'duration_asc':
      return rankFlightsByDuration(flights);
    case 'duration_desc':
      return rankFlightsByNumber(flights, (flight) => parseDurationMinutes(flight.duration ?? flight.rawText), 'desc');
    case 'baggage_desc':
      return rankFlightsByBaggage(flights);
    case 'baggage_asc':
      return rankFlightsByNumber(flights, (flight) => parseBaggageWeight(flight.baggage ?? flight.rawText), 'asc');
    case 'departure_asc':
      return rankFlightsByNumber(flights, (flight) => parseTimeMinutes(flight.departure ?? flight.rawText, 0), 'asc');
    case 'departure_desc':
      return rankFlightsByNumber(flights, (flight) => parseTimeMinutes(flight.departure ?? flight.rawText, 0), 'desc');
    case 'arrival_asc':
      return rankFlightsByNumber(flights, (flight) => parseTimeMinutes(flight.arrival ?? flight.rawText, flight.arrival ? 0 : 1), 'asc');
    case 'arrival_desc':
      return rankFlightsByNumber(flights, (flight) => parseTimeMinutes(flight.arrival ?? flight.rawText, flight.arrival ? 0 : 1), 'desc');
    case 'stops_asc':
      return rankFlightsByNumber(flights, (flight) => parseStopsCount(flight.stops ?? flight.rawText), 'asc');
    case 'stops_desc':
      return rankFlightsByNumber(flights, (flight) => parseStopsCount(flight.stops ?? flight.rawText), 'desc');
  }
}

function buildFilterLabel(filter: FlightListFilterCriteria): string {
  const value = formatCriteriaValue(filter.value);
  const min = formatCriteriaValue(filter.min);
  const max = formatCriteriaValue(filter.max);

  if (filter.operator === 'between') {
    return `${filter.field} between ${min ?? '?'} and ${max ?? '?'}`;
  }

  return [filter.field, filter.operator.replace(/_/g, ' '), value].filter(Boolean).join(' ');
}

function formatCriteriaValue(value: string | number | undefined): string | null {
  if (value === undefined) return null;
  return String(value);
}

function matchFlightCriterion(
  flight: VisibleFlight,
  filter: FlightListFilterCriteria,
): CriterionMatch {
  if (filter.operator === 'between') {
    return matchBetweenCriterion(flight, filter);
  }

  const flightValue = getFlightComparableValue(flight, filter.field);
  if (flightValue === null) return 'unavailable';

  if (typeof flightValue === 'number') {
    const target = parseCriteriaNumber(filter.value);
    if (target === null) return 'unavailable';
    return compareNumbers(flightValue, target, filter.operator) ? 'match' : 'no_match';
  }

  const target = normalizeCriteriaText(filter);
  if (!target) return 'unavailable';

  return compareText(flightValue, target, filter.operator) ? 'match' : 'no_match';
}

function matchBetweenCriterion(
  flight: VisibleFlight,
  filter: FlightListFilterCriteria,
): CriterionMatch {
  const flightValue = getFlightComparableValue(flight, filter.field);
  const min = parseCriteriaNumber(filter.min);
  const max = parseCriteriaNumber(filter.max);

  if (typeof flightValue !== 'number' || min === null || max === null) {
    return 'unavailable';
  }

  return flightValue >= min && flightValue <= max ? 'match' : 'no_match';
}

function getFlightComparableValue(
  flight: VisibleFlight,
  field: FlightListFilterCriteria['field'],
): string | number | null {
  switch (field) {
    case 'airline':
      return `${flight.airline ?? ''} ${flight.rawText ?? ''}`.trim() || null;
    case 'price':
      return parsePriceAmount(flight.price ?? flight.rawText);
    case 'stops':
      return parseStopsCount(flight.stops ?? flight.rawText);
    case 'refundability':
      return parseRefundability(flight.refundability ?? flight.rawText);
    case 'duration':
      return parseDurationMinutes(flight.duration ?? flight.rawText);
    case 'baggage':
      return parseBaggageWeight(flight.baggage ?? flight.rawText);
    case 'departure':
      return parseTimeMinutes(flight.departure ?? flight.rawText, 0);
    case 'arrival':
      return parseTimeMinutes(flight.arrival ?? flight.rawText, flight.arrival ? 0 : 1);
    case 'origin':
      return flight.origin ?? flight.rawText ?? null;
    case 'destination':
      return flight.destination ?? flight.rawText ?? null;
    case 'rawText':
      return flight.rawText ?? null;
  }
}

function normalizeCriteriaText(filter: FlightListFilterCriteria): string {
  if (filter.field === 'refundability') {
    return parseRefundability(String(filter.value ?? '')) ?? normalizeForMatching(String(filter.value ?? ''));
  }
  return normalizeForMatching(String(filter.value ?? ''));
}

function compareText(
  flightValue: string,
  target: string,
  operator: FlightListFilterCriteria['operator'],
): boolean {
  const normalizedFlightValue = normalizeForMatching(flightValue);
  const contains =
    hasNormalizedPhrase(normalizedFlightValue, target) ||
    hasMatchingWordSet(normalizedFlightValue, target) ||
    normalizedFlightValue.includes(target);

  if (operator === 'not_equals') return !contains;
  if (operator === 'equals') return normalizedFlightValue === target;
  return contains;
}

function compareNumbers(
  flightValue: number,
  target: number,
  operator: FlightListFilterCriteria['operator'],
): boolean {
  switch (operator) {
    case 'equals':
    case 'contains':
      return flightValue === target;
    case 'not_equals':
      return flightValue !== target;
    case 'less_than':
      return flightValue < target;
    case 'less_than_or_equal':
      return flightValue <= target;
    case 'greater_than':
      return flightValue > target;
    case 'greater_than_or_equal':
      return flightValue >= target;
    case 'between':
      return false;
  }
}

function rankFlightsByPrice(flights: VisibleFlight[]): VisibleFlight[] {
  return flights
    .map((flight) => ({ flight, price: parsePriceAmount(flight.price ?? flight.rawText) }))
    .filter((item) => item.price !== null)
    .sort((a, b) => {
      if (a.price === null && b.price === null) return a.flight.index - b.flight.index;
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return a.price - b.price;
    })
    .map((item) => item.flight);
}

function rankFlightsByDuration(flights: VisibleFlight[]): VisibleFlight[] {
  return flights
    .map((flight) => ({ flight, minutes: parseDurationMinutes(flight.duration ?? flight.rawText) }))
    .filter((item) => item.minutes !== null)
    .sort((a, b) => {
      if (a.minutes === null && b.minutes === null) return a.flight.index - b.flight.index;
      if (a.minutes === null) return 1;
      if (b.minutes === null) return -1;
      return a.minutes - b.minutes;
    })
    .map((item) => item.flight);
}

function rankFlightsByBaggage(flights: VisibleFlight[]): VisibleFlight[] {
  return flights
    .map((flight) => ({ flight, weight: parseBaggageWeight(flight.baggage ?? flight.rawText) }))
    .filter((item) => item.weight !== null)
    .sort((a, b) => {
      if (a.weight === null && b.weight === null) return a.flight.index - b.flight.index;
      if (a.weight === null) return 1;
      if (b.weight === null) return -1;
      return b.weight - a.weight;
    })
    .map((item) => item.flight);
}

function rankFlightsByNumber(
  flights: VisibleFlight[],
  getValue: (flight: VisibleFlight) => number | null,
  direction: 'asc' | 'desc',
): VisibleFlight[] {
  return flights
    .map((flight) => ({ flight, value: getValue(flight) }))
    .filter((item) => item.value !== null)
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.flight.index - b.flight.index;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return direction === 'asc' ? a.value - b.value : b.value - a.value;
    })
    .map((item) => item.flight);
}
