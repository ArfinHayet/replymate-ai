export type FlightListItem = {
  index: number;
  rawText: string;
  origin?: string | null;
  destination?: string | null;
  price?: string | null;
  baggage?: string | null;
  airline?: string | null;
  duration?: string | null;
  departure?: string | null;
  arrival?: string | null;
  stops?: string | null;
};

export type FlightListContext = {
  type: 'flight_list';
  url?: string;
  detectedAt?: string;
  totalFlights: number;
  flights: FlightListItem[];
};

export type FlightCardDomManipulation = {
  type: 'highlight_flight_card';
  flightIndex: number;
  label?: string;
};

export type WidgetDomManipulation = FlightCardDomManipulation;
