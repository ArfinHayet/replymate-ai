import { Injectable } from '@nestjs/common';
import axios from 'axios';
import {
  ChatToolConfigResponse,
  ChatToolRuntimeResult,
} from '../../features/chat-tools/chat-tools.types';

export type FlightTripType = 'one_way' | 'round_trip' | 'multi_city';

export type FlightSearchToolInput = {
  tripType: FlightTripType;
  originCode: string;
  destinationCode: string;
  originName?: string;
  destinationName?: string;
  originAirportName?: string;
  destinationAirportName?: string;
  originCountryName?: string;
  destinationCountryName?: string;
  departDate: string;
  returnDate?: string;
  adult?: number;
  child?: number;
  childAge?: string;
  infant?: number;
  cabinClass?: string;
};

type TravelpayoutsPlace = {
  code?: unknown;
  name?: unknown;
  type?: unknown;
  country_name?: unknown;
  countryName?: unknown;
};

const REDIRECT_DELAY_MS = 1200;
const AUTOCOMPLETE_URL = 'https://autocomplete.travelpayouts.com/places2';

@Injectable()
export class ToolRetrievalService {
  async cityToAirport(location: string): Promise<string> {
    const cleanedLocation = location.trim();
    if (!cleanedLocation) {
      return 'No airport found. Ask the user to clarify the city, airport, or country.';
    }

    try {
      const response = await axios.get<TravelpayoutsPlace[]>(AUTOCOMPLETE_URL, {
        params: {
          locale: 'en',
          term: cleanedLocation,
          'types[]': ['city', 'airport', 'country'],
        },
        timeout: 8000,
      });

      const places = Array.isArray(response.data) ? response.data : [];
      const matches = places
        .map((place) => ({
          code: stringValue(place.code),
          name: stringValue(place.name),
          type: stringValue(place.type),
          country_name: stringValue(place.country_name ?? place.countryName),
        }))
        .filter((place) => Boolean(place.code))
        .slice(0, 5);

      if (matches.length === 0) {
        return `No airport found for "${cleanedLocation}". Ask the user to clarify the city, airport, or country.`;
      }

      return JSON.stringify({ location: cleanedLocation, matches });
    } catch {
      return `No airport found for "${cleanedLocation}". The airport lookup service failed, so ask the user to clarify the city or airport.`;
    }
  }

  buildFlightRedirect(
    config: ChatToolConfigResponse,
    input: FlightSearchToolInput,
  ): ChatToolRuntimeResult {
    const missing = this.getMissingFlightFields(input);
    if (missing.length > 0) {
      return { answer: `Please share ${missing.join(', ')} for the flight search.` };
    }

    const template = this.getFlightTemplate(config, input.tripType);
    if (!template) {
      return { answer: 'Flight search is not fully configured yet.' };
    }

    return this.redirect(
      'Redirecting to flight page',
      this.buildFlightUrl(template, input),
    );
  }

  buildLiveAgentRedirect(config: ChatToolConfigResponse): ChatToolRuntimeResult {
    const redirectUrl = stringConfig(config, 'redirectUrl');
    if (!redirectUrl) {
      return { answer: 'Live agent contact tool is not fully configured yet.' };
    }

    return this.redirect('Redirecting to Live Agent', redirectUrl);
  }

  private getMissingFlightFields(input: FlightSearchToolInput): string[] {
    const missing: string[] = [];
    if (!input.originCode?.trim()) missing.push('origin');
    if (!input.destinationCode?.trim()) missing.push('destination');
    if (!input.departDate?.trim()) missing.push('departure date');
    if (input.tripType === 'round_trip' && !input.returnDate?.trim()) {
      missing.push('return date');
    }
    return missing;
  }

  private getFlightTemplate(
    config: ChatToolConfigResponse,
    tripType: FlightTripType,
  ): string | null {
    if (tripType === 'round_trip') return stringConfig(config, 'roundTripTemplateUrl');
    if (tripType === 'multi_city') return stringConfig(config, 'multiCityTemplateUrl');
    return stringConfig(config, 'oneWayTemplateUrl');
  }

  private buildFlightUrl(template: string, input: FlightSearchToolInput): string {
    const url = new URL(template);
    this.setParamIfPresent(url, 'adult', String(input.adult ?? 1), true);
    this.setParamIfPresent(url, 'child', String(input.child ?? 0), true);
    this.setParamIfPresent(url, 'child_age', input.childAge ?? '');
    this.setParamIfPresent(url, 'infant', String(input.infant ?? 0), true);
    this.setParamIfPresent(url, 'cabin_class', input.cabinClass ?? 'Economy');
    this.setParamIfPresent(url, 'class', input.cabinClass ?? 'Economy');
    this.setParamIfPresent(url, 'depart', input.departDate);
    this.setParamIfPresent(url, 'return', input.returnDate ?? '');
    this.setParamIfPresent(url, 'origin', input.originCode);
    this.setParamIfPresent(url, 'destination', input.destinationCode);
    this.setParamIfPresent(url, 'originCity', input.originName ?? input.originCode);
    this.setParamIfPresent(url, 'destinationCity', input.destinationName ?? input.destinationCode);
    this.setParamIfPresent(
      url,
      'originAirport',
      this.formatAirportLabel(
        input.originCountryName,
        input.originAirportName ?? input.originName,
        input.originCode,
      ),
    );
    this.setParamIfPresent(
      url,
      'destinationAirport',
      this.formatAirportLabel(
        input.destinationCountryName,
        input.destinationAirportName ?? input.destinationName,
        input.destinationCode,
      ),
    );
    this.setParamIfPresent(url, 'tripType', this.formatTripType(input.tripType));

    if (url.searchParams.has('trips')) {
      return setRawQueryParam(url, 'trips', this.buildTripsParam(input));
    }

    return url.toString();
  }

  private setParamIfPresent(
    url: URL,
    key: string,
    value: string,
    addWhenMissing = false,
  ) {
    if (addWhenMissing || url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  private formatAirportLabel(
    countryName: string | undefined,
    airportName: string | undefined,
    code: string,
  ): string {
    const normalizedCode = code.trim();
    const normalizedAirportName = airportName?.trim();
    const normalizedCountryName = countryName?.trim();

    if (normalizedCountryName && normalizedAirportName) {
      return `${normalizedCountryName}, ${normalizedAirportName} (${normalizedCode})`;
    }
    if (normalizedAirportName) return `${normalizedAirportName} (${normalizedCode})`;
    return normalizedCode;
  }

  private formatTripType(tripType: FlightTripType): string {
    if (tripType === 'round_trip') return 'RoundTrip';
    if (tripType === 'multi_city') return 'MultiCity';
    return 'OneWay';
  }

  private buildTripsParam(input: FlightSearchToolInput): string {
    const outbound = `${input.originCode},${input.destinationCode},${input.departDate}`;
    if (input.tripType === 'round_trip' && input.returnDate) {
      return `${outbound}|${input.destinationCode},${input.originCode},${input.returnDate}`;
    }
    return outbound;
  }

  private redirect(answer: string, url: string): ChatToolRuntimeResult {
    return {
      answer,
      action: {
        type: 'redirect',
        target: 'new_tab',
        url,
        delayMs: REDIRECT_DELAY_MS,
      },
    };
  }
}

function stringConfig(config: ChatToolConfigResponse, key: string): string | null {
  const value = config.config[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function setRawQueryParam(url: URL, key: string, value: string): string {
  const query = url.search
    .slice(1)
    .split('&')
    .filter((part) => part && decodeURIComponent(part.split('=')[0]) !== key);

  query.push(`${encodeURIComponent(key)}=${value}`);

  return `${url.origin}${url.pathname}?${query.join('&')}${url.hash}`;
}
