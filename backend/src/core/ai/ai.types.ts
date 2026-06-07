import type {
  FlightListContext,
  WidgetDomManipulation,
} from '../../features/chat/flight-list-context';
import type { ChatRedirectAction } from '../../features/chat-tools/chat-tools.types';
import type { FlightListCriteria } from './visible-flights/visible-flight-criteria';

/** History shape shared with ChatService */
export interface Message {
  role: 'user' | 'model';
  parts: { text?: string }[];
}

export type QueryIntentClassification = {
  isFollowUp: boolean;
  intent:
    | 'direct'
    | 'follow_up'
    | 'standalone_knowledge_page'
    | 'flight_list_query'
    | 'clarification_needed';
  resolvedQuery: string;
  flightListCriteria?: FlightListCriteria;
};

export type VisibleFlightAnalysisResult = {
  answer: string;
  selectedFlight?: FlightListContext['flights'][number];
  rankedFlights?: FlightListContext['flights'];
  dommanipulate?: WidgetDomManipulation;
};

export type AgenticLoopResult = {
  answer: string;
  action?: ChatRedirectAction;
  dommanipulate?: WidgetDomManipulation;
  usedToolKeys?: string[];
};

const TOOL_QUERY_CONTEXT_TURNS = 6;
const TOOL_QUERY_CONTEXT_CHAR_LIMIT = 1600;

export function buildContextualToolQuery(
  toolQuery: string,
  history: Message[],
  userMessage: string,
  retrievalIntent?: string,
): string {
  const recentContext = history
    .slice(-TOOL_QUERY_CONTEXT_TURNS)
    .map((m) => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      const text = m.parts.map((p) => p.text ?? '').join('').trim();
      return text ? `${role}: ${text}` : '';
    })
    .filter(Boolean)
    .join('\n')
    .slice(-TOOL_QUERY_CONTEXT_CHAR_LIMIT);

  if (!recentContext && !retrievalIntent) return toolQuery;

  return [
    `Tool query: ${toolQuery}`,
    `Current user question: ${userMessage}`,
    retrievalIntent ? `Standalone retrieval intent:\n${retrievalIntent}` : '',
    recentContext ? `Recent conversation context:\n${recentContext}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
