import { Injectable } from '@nestjs/common';
import type {
  FlightListContext,
  WidgetDomManipulation,
} from '../../../features/chat/flight-list-context';
import type { VisibleFlightAnalysisResult } from '../ai.types';
import { QueryIntentClassifier } from '../query-intent.classifier';
import {
  applyVisibleFlightCriteria,
  buildCriteriaLabel,
  buildSortLabel,
  hasFlightListCriteria,
  rankFlightsByCriteria,
  type FlightListCriteria,
} from './visible-flight-criteria';

@Injectable()
export class VisibleFlightAnalyzerService {
  constructor(private readonly queryIntentClassifier: QueryIntentClassifier) {}

  async analyzeVisibleFlightContext(
    query: string,
    flightListContext: FlightListContext,
    flightListCriteria?: FlightListCriteria,
  ): Promise<VisibleFlightAnalysisResult> {
    const flights = flightListContext.flights.filter((flight) => flight.rawText?.trim());

    if (flights.length === 0) {
      return { answer: 'No visible flight cards were available to analyze.' };
    }

    const criteria = flightListCriteria ?? await this.classifyVisibleFlightCriteria(query, flightListContext);
    if (!hasFlightListCriteria(criteria)) {
      return {
        answer:
          'I can see the visible flight results, but I could not infer a specific visible-card filter or ranking from that request.',
        rankedFlights: flights.slice(0, 5),
      };
    }

    const filters = criteria.filters ?? [];
    const label = buildCriteriaLabel(criteria);
    const filterResult = applyVisibleFlightCriteria(flights, filters);

    if (filterResult.unavailableLabels.length > 0) {
      return {
        answer:
          `The visible flight cards do not include enough information to apply ${filterResult.unavailableLabels.join(', ')}.`,
        rankedFlights: [],
      };
    }

    if (filterResult.matches.length === 0) {
      return {
        answer: `I could not find any visible flights matching ${label}.`,
        rankedFlights: [],
      };
    }

    const rankedBySort = rankFlightsByCriteria(filterResult.matches, criteria.sort);
    if (criteria.sort && criteria.sort !== 'none' && rankedBySort.length === 0) {
      return {
        answer: `The visible flight cards do not include enough information to rank by ${buildSortLabel(criteria.sort)}.`,
        rankedFlights: filterResult.matches.slice(0, 5),
      };
    }

    const rankedFlights = rankedBySort.length > 0 ? rankedBySort : filterResult.matches;
    const singleBest =
      criteria.selection === 'single_best' ||
      Boolean(criteria.sort && criteria.sort !== 'none');

    if (singleBest) {
      return this.buildVisibleFlightResult(
        label,
        `This visible flight best matches ${label}.`,
        rankedFlights[0],
        rankedFlights,
      );
    }

    return this.buildVisibleFlightGroupResult(
      label,
      `These visible flights match ${label}.`,
      rankedFlights,
    );
  }

  private async classifyVisibleFlightCriteria(
    query: string,
    flightListContext: FlightListContext,
  ): Promise<FlightListCriteria | undefined> {
    const classification = await this.queryIntentClassifier.classifyQueryIntent(
      [],
      query,
      undefined,
      flightListContext,
    );

    if (classification.intent !== 'flight_list_query') return undefined;
    return classification.flightListCriteria;
  }

  private buildVisibleFlightResult(
    label: string,
    answer: string,
    selectedFlight: FlightListContext['flights'][number],
    rankedFlights: FlightListContext['flights'],
  ): VisibleFlightAnalysisResult {
    return {
      answer,
      selectedFlight,
      rankedFlights: rankedFlights.slice(0, 5),
      dommanipulate: {
        type: 'highlight_flight_card' as const,
        flightIndex: selectedFlight.index,
        label,
      },
    };
  }

  private buildVisibleFlightGroupResult(
    label: string,
    answer: string,
    rankedFlights: FlightListContext['flights'],
  ): VisibleFlightAnalysisResult {
    return {
      answer,
      selectedFlight: rankedFlights[0],
      rankedFlights: rankedFlights.slice(0, 25),
      dommanipulate: {
        type: 'highlight_flight_cards' as const,
        flightIndexes: rankedFlights.map((flight) => flight.index),
        label,
      } satisfies WidgetDomManipulation,
    };
  }
}
