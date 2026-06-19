import {
  applyVisibleFlightCriteria,
  rankFlightsByCriteria,
} from './visible-flight-criteria';

describe('visible flight criteria', () => {
  const flights = [
    {
      index: 1,
      rawText: 'Biman Bangladesh DAC KUL BDT 12000 06:15 20kg Refundable',
      airline: 'Biman Bangladesh',
      price: 'BDT 12000',
      departure: '06:15',
      baggage: '20kg',
      refundability: 'Refundable',
    },
    {
      index: 2,
      rawText: 'Biman Bangladesh DAC KUL BDT 17000 14:30 30kg Refundable',
      airline: 'Biman Bangladesh',
      price: 'BDT 17000',
      departure: '14:30',
      baggage: '30kg',
      refundability: 'Refundable',
    },
    {
      index: 3,
      rawText: 'US-Bangla DAC KUL BDT 14500 19:45 Meal included Non-Refundable',
      airline: 'US-Bangla',
      price: 'BDT 14500',
      departure: '19:45',
      refundability: 'Non-Refundable',
    },
  ];

  it('intersects structured and raw text filters', () => {
    const result = applyVisibleFlightCriteria(flights, [
      { field: 'airline', operator: 'contains', value: 'Biman Bangladesh' },
      { field: 'price', operator: 'between', min: '10k', max: '15k' },
    ]);

    expect(result.unavailableLabels).toEqual([]);
    expect(result.matches.map((flight) => flight.index)).toEqual([1]);
  });

  it('matches truncated airline names and codes', () => {
    const testFlights = [
      {
        index: 1,
        rawText: 'Onward Malaysia A... MH DAC 6/20/2026 02:05 AM',
        airline: 'Onward Malaysia A... MH',
      },
      {
        index: 2,
        rawText: 'Onward Singapore ... SQ DAC 6/20/2026 11:55 PM',
        airline: 'Onward Singapore ... SQ',
      },
      {
        index: 3,
        rawText: 'Onward Turkish Ai... TK DAC 6/20/2026 08:30 PM',
        airline: 'Onward Turkish Ai... TK',
      },
    ];

    // Match by name including "Airlines"
    const res1 = applyVisibleFlightCriteria(testFlights, [
      { field: 'airline', operator: 'contains', value: 'Malaysia Airlines' },
    ]);
    expect(res1.matches.map((f) => f.index)).toEqual([1]);

    // Match by code
    const res2 = applyVisibleFlightCriteria(testFlights, [
      { field: 'airline', operator: 'contains', value: 'SQ' },
    ]);
    expect(res2.matches.map((f) => f.index)).toEqual([2]);

    // Match by unmapped name with "Airlines"
    const res3 = applyVisibleFlightCriteria(testFlights, [
      { field: 'airline', operator: 'contains', value: 'Turkish Airlines' },
    ]);
    expect(res3.matches.map((f) => f.index)).toEqual([3]);
  });

  it('ranks matching flights by criteria sort', () => {
    const ranked = rankFlightsByCriteria(flights, 'baggage_desc');

    expect(ranked.map((flight) => flight.index)).toEqual([2, 1]);
  });
});
