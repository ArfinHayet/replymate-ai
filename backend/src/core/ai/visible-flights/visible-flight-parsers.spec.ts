import {
  parseBaggageWeight,
  parseCriteriaNumber,
  parseDurationMinutes,
  parsePriceAmount,
  parseRefundability,
  parseStopsCount,
  parseTimeMinutes,
} from './visible-flight-parsers';

describe('visible flight parsers', () => {
  it('parses compact numbers and common flight card values', () => {
    expect(parseCriteriaNumber('10k')).toBe(10000);
    expect(parseCriteriaNumber('15,500')).toBe(15500);
    expect(parsePriceAmount('BDT 12,500')).toBe(12500);
    expect(parseDurationMinutes('4h 30m')).toBe(270);
    expect(parseBaggageWeight('checked baggage 20kg')).toBe(20);
    expect(parseStopsCount('non-stop')).toBe(0);
    expect(parseStopsCount('2 layovers')).toBe(2);
    expect(parseTimeMinutes('06:15')).toBe(375);
    expect(parseRefundability('Non Refundable')).toBe('non-refundable');
  });
});
