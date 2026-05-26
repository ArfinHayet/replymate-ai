import axios from 'axios';
import { ToolRetrievalService } from './tool-retrieval.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const flightConfig = {
  toolKey: 'flight_search' as const,
  enabled: true,
  config: {
    oneWayTemplateUrl:
      'https://template1.myota.xyz/flightlist?adult=2&child=0&child_age=&infant=0&cabin_class=Economy&trips=DAC,ZYL,2026-05-29',
    roundTripTemplateUrl:
      'https://template1.myota.xyz/flightlist?adult=1&child=0&child_age=&infant=0&cabin_class=Economy&trips=DAC,KUL,2026-05-29%7CKUL,DAC,2026-06-05',
    multiCityTemplateUrl:
      'https://template1.myota.xyz/flightlist?adult=1&child=0&child_age=&infant=0&cabin_class=Economy&trips=DAC,KUL,2026-05-29',
  },
};

const liveAgentConfig = {
  toolKey: 'live_agent_contact' as const,
  enabled: true,
  config: {
    redirectUrl: 'https://wa.me/8801000000000',
  },
};

const shareTripConfig = {
  toolKey: 'flight_search' as const,
  enabled: true,
  config: {
    oneWayTemplateUrl:
      "https://sharetrip.net/flight-search?adult=1&child=0&child2To5Count=0&child6To12Count=0&class=Economy&depart=2026-05-27&destination=CXB&destinationAirport=Bangladesh%2C%20Cox%27s%20Bazar%20Airport%20%28CXB%29&destinationCity=Cox%27s%20Bazar&infant=0&occupation=NOT_SELECTED&origin=DAC&originAirport=Bangladesh%2C%20Hazrat%20Shahjalal%20International%20Airport%20%28DAC%29&originCity=Dhaka&tripType=OneWay",
    roundTripTemplateUrl:
      "https://sharetrip.net/flight-search?adult=1&child=0&class=Economy&depart=2026-05-27&destination=CXB&destinationCity=Cox%27s%20Bazar&infant=0&origin=DAC&originCity=Dhaka&return=2026-05-30&tripType=RoundTrip",
    multiCityTemplateUrl:
      "https://sharetrip.net/flight-search?adult=1&child=0&class=Economy&depart=2026-05-27&destination=CXB&destinationCity=Cox%27s%20Bazar&infant=0&origin=DAC&originCity=Dhaka&tripType=MultiCity",
  },
};

describe('ToolRetrievalService', () => {
  let service: ToolRetrievalService;

  beforeEach(() => {
    service = new ToolRetrievalService();
    jest.clearAllMocks();
  });

  it('calls the third-party city autocomplete API and returns compact code matches', async () => {
    mockedAxios.get.mockResolvedValue({
      data: [
        {
          code: 'DAC',
          name: 'Dhaka',
          type: 'city',
          country_name: 'Bangladesh',
        },
      ],
    });

    const result = await service.cityToAirport('Dhaka');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://autocomplete.travelpayouts.com/places2',
      expect.objectContaining({
        params: expect.objectContaining({
          locale: 'en',
          term: 'Dhaka',
          'types[]': ['city', 'airport', 'country'],
        }),
      }),
    );
    expect(JSON.parse(result)).toEqual({
      location: 'Dhaka',
      matches: [
        {
          code: 'DAC',
          name: 'Dhaka',
          type: 'city',
          country_name: 'Bangladesh',
        },
      ],
    });
  });

  it('returns a clear no-airport result when lookup has no matches', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });

    await expect(service.cityToAirport('Unknownville')).resolves.toContain(
      'No airport found for "Unknownville"',
    );
  });

  it('builds a flight redirect URL from structured tool input', () => {
    const result = service.buildFlightRedirect(flightConfig, {
      tripType: 'one_way',
      originCode: 'DAC',
      destinationCode: 'KUL',
      departDate: '2026-05-29',
      adult: 2,
      infant: 1,
      cabinClass: 'Economy',
    });

    expect(result.answer).toBe('Redirecting to flight page');
    const url = new URL(result.action?.url ?? '');
    expect(url.origin + url.pathname).toBe('https://template1.myota.xyz/flightlist');
    expect(url.searchParams.get('adult')).toBe('2');
    expect(url.searchParams.get('child')).toBe('0');
    expect(url.searchParams.get('infant')).toBe('1');
    expect(url.searchParams.get('cabin_class')).toBe('Economy');
    expect(url.searchParams.get('trips')).toBe('DAC,KUL,2026-05-29');
    expect(result.action?.url).toContain('trips=DAC,KUL,2026-05-29');
  });

  it('keeps flight trip commas unencoded for OTA redirect URLs', () => {
    const result = service.buildFlightRedirect(flightConfig, {
      tripType: 'one_way',
      originCode: 'DAC',
      destinationCode: 'DXB',
      departDate: '2026-12-10',
      adult: 1,
      child: 0,
      infant: 0,
      cabinClass: 'Economy',
    });

    expect(result.action?.url).toBe(
      'https://template1.myota.xyz/flightlist?adult=1&child=0&child_age=&infant=0&cabin_class=Economy&trips=DAC,DXB,2026-12-10',
    );
  });

  it('updates ShareTrip-style template params without appending OTA trips params', () => {
    const result = service.buildFlightRedirect(shareTripConfig, {
      tripType: 'one_way',
      originCode: 'DAC',
      destinationCode: 'DXB',
      originName: 'Dhaka',
      destinationName: 'Dubai',
      originAirportName: 'Hazrat Shahjalal International Airport',
      destinationAirportName: 'Dubai International Airport',
      originCountryName: 'Bangladesh',
      destinationCountryName: 'United Arab Emirates',
      departDate: '2026-12-12',
      adult: 1,
      child: 0,
      infant: 0,
      cabinClass: 'Economy',
    });

    const url = new URL(result.action?.url ?? '');
    expect(url.origin + url.pathname).toBe('https://sharetrip.net/flight-search');
    expect(url.searchParams.get('origin')).toBe('DAC');
    expect(url.searchParams.get('destination')).toBe('DXB');
    expect(url.searchParams.get('depart')).toBe('2026-12-12');
    expect(url.searchParams.get('tripType')).toBe('OneWay');
    expect(url.searchParams.get('class')).toBe('Economy');
    expect(url.searchParams.get('originCity')).toBe('Dhaka');
    expect(url.searchParams.get('destinationCity')).toBe('Dubai');
    expect(url.searchParams.get('destinationAirport')).toBe(
      'United Arab Emirates, Dubai International Airport (DXB)',
    );
    expect(url.searchParams.has('trips')).toBe(false);
    expect(url.searchParams.has('cabin_class')).toBe(false);
    expect(url.searchParams.has('child_age')).toBe(false);
  });

  it('asks for missing structured flight fields instead of redirecting', () => {
    const result = service.buildFlightRedirect(flightConfig, {
      tripType: 'round_trip',
      originCode: 'DAC',
      destinationCode: '',
      departDate: '2026-05-29',
    });

    expect(result).toEqual({
      answer: 'Please share destination, return date for the flight search.',
    });
  });

  it('builds a live agent redirect action', () => {
    expect(service.buildLiveAgentRedirect(liveAgentConfig)).toEqual({
      answer: 'Redirecting to Live Agent',
      action: {
        type: 'redirect',
        target: 'new_tab',
        url: 'https://wa.me/8801000000000',
        delayMs: 1200,
      },
    });
  });
});
