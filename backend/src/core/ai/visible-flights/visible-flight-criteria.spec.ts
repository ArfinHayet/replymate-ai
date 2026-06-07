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

  it('ranks matching flights by criteria sort', () => {
    const ranked = rankFlightsByCriteria(flights, 'baggage_desc');

    expect(ranked.map((flight) => flight.index)).toEqual([2, 1]);
  });
});
