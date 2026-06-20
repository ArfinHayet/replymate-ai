import { Injectable, Logger } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import type { FlightListContext } from '../../features/chat/flight-list-context';
import type { ProductListContext } from '../../features/chat/product-list-context';
import { LlmFactoryService } from '../llm/llm-factory.service';
import type { Message, QueryIntentClassification } from './ai.types';
import {
  flightListCriteriaSchema,
  hasFlightListCriteria,
} from './visible-flights/visible-flight-criteria';
import {
  productListCriteriaSchema,
  hasProductListCriteria,
} from './visible-products/visible-product-criteria';

const queryIntentOutputSchema = z.object({
  isFollowUp: z.boolean().describe(
    'True when the user message depends on a previous subject or context.',
  ),
  intent: z.enum([
    'direct',
    'follow_up',
    'standalone_knowledge_page',
    'flight_list_query',
    'product_list_query',
    'clarification_needed',
  ]),
  resolvedQuery: z.string().describe(
    'A standalone retrieval/search query. Use an empty string only when clarification is needed.',
  ),
  flightListCriteria: flightListCriteriaSchema.describe(
    'Only set for flight_list_query. Structured criteria for filtering and ranking visible flight cards.',
  ),
  productListCriteria: productListCriteriaSchema.describe(
    'Only set for product_list_query. Structured criteria for filtering and ranking visible product cards.',
  ),
});

@Injectable()
export class QueryIntentClassifier {
  private readonly logger = new Logger(QueryIntentClassifier.name);

  constructor(private readonly llmFactory: LlmFactoryService) {}

  async classifyQueryIntent(
    history: Message[],
    userMessage: string,
    activeCompanyName?: string,
    flightListContext?: FlightListContext,
    productListContext?: ProductListContext,
  ): Promise<QueryIntentClassification> {
    const recentHistory = history
      .slice(-8)
      .map((m) => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        const text = m.parts.map((p) => p.text ?? '').join('').trim();
        return text ? `${role}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n')
      .slice(-2500);

    const prompt = [
      'Classify the current user message for a RAG chatbot.',
      '',
      'Return only the structured JSON fields required by the schema.',
      '',
      'Intent meanings:',
      '- direct: the message is already answerable as a standalone request.',
      '- follow_up: the message depends on a subject from recent history or the active company profile.',
      '- standalone_knowledge_page: the user is asking for a common website page such as terms and conditions, privacy policy, refund policy, return policy, FAQ, about us, or contact us.',
      '- flight_list_query: flightListContext is present and the user asks to compare, rank, filter, select, or explain flights from the visible flight results list.',
      '- product_list_query: productListContext is present and the user asks to compare, filter, rank, or select products/services from the visible product/service list.',
      '- clarification_needed: the message is a follow-up, but no subject can be resolved from history or the active company profile.',
      '',
      'Rules:',
      '- Use flight_list_query only when flightListContext is present. The resolvedQuery should describe the user goal over the visible flight list.',
      '- For flight_list_query, also return flightListCriteria with structured filters, optional sort, selection, and label.',
      '- Filter fields for flights are airline, price, stops, refundability, duration, baggage, departure, arrival, origin, destination, and rawText.',
      '- For price, duration, baggage, stops, departure, and arrival filters, use numeric values only. Use price numbers as shown by the card currency without converting currency. Use duration in minutes, baggage in kilograms, stops as a count, and departure/arrival as minutes after midnight.',
      '- Convert compact amounts such as 10k or 15k into 10000 or 15000 in flightListCriteria.',
      '- Time windows: morning is departure/arrival between 300 and 719, afternoon 720 to 1019, evening 1020 to 1259, night 1260 to 1439 or 0 to 299.',
      '- Use operator between for ranges such as "fare ranging 10 to 15k BDT".',
      '- Use rawText contains for filters that do not fit a structured field.',
      '- Use selection single_best when the user asks for best/cheapest/fastest/earliest/latest/highest/fewest or asks to select one. Use all_matches when the user asks to show/filter/list all matching flights.',
      '- When flightListContext is present, visible airline filters such as "show [airline] flights" are flight_list_query, not flight search.',
      '- Do not use flight_list_query for a new route/date search such as "Dhaka to Dubai tomorrow".',
      '',
      '- Use product_list_query only when productListContext is present and the user asks about the visible products/services (filter, compare, recommend, pick cheapest, highest rated, on sale, etc.).',
      '- For product_list_query, return productListCriteria with structured filters, optional sort, selection, and label.',
      '- Filter fields for products are: name, price, originalPrice, discount, rating, reviewCount, availability, brand, rawText.',
      '- For price and originalPrice, use numeric values in the card currency. For discount, use percentage as a number (e.g. 20 for 20%). For rating, use the numeric value (e.g. 4.5). For reviewCount, use the integer count.',
      '- Sort values for products: price_asc, price_desc, rating_desc, rating_asc, discount_desc, reviewCount_desc.',
      '- Use selection single_best when the user asks for the cheapest/most expensive/highest rated/most reviewed/biggest discount single product. Use all_matches for show/filter/list all.',
      '- Example (products): "cheapest product" => sort price_asc, selection single_best.',
      '- Example (products): "products with rating above 4" => filter rating greater_than 4, selection all_matches.',
      '- Example (products): "show items on sale" => filter discount greater_than 0, selection all_matches, label "On sale".',
      '- Example (products): "Nike shoes under $50" => filter brand contains Nike AND price less_than_or_equal 50, selection all_matches.',
      '',
      '- For follow_up, resolve the missing subject from recent history first, then the active company profile.',
      '- For standalone_knowledge_page, do not mark it as a follow-up. Build a rich retrieval query that includes the page title and likely section words.',
      '- For direct, resolvedQuery should be the best concise standalone retrieval query for the message.',
      '- For clarification_needed, resolvedQuery must be an empty string.',
      '',
      activeCompanyName ? `Active company profile: ${activeCompanyName}` : 'Active company profile: none',
      flightListContext
        ? `Flight list context: present with ${flightListContext.totalFlights} visible flights`
        : 'Flight list context: none',
      flightListContext ? buildFlightListClassifierSummary(flightListContext) : '',
      productListContext
        ? `Product list context: present with ${productListContext.totalProducts} visible products`
        : 'Product list context: none',
      productListContext ? buildProductListClassifierSummary(productListContext) : '',
      recentHistory ? `Recent history:\n${recentHistory}` : 'Recent history: none',
      `Current user message: ${userMessage}`,
    ].join('\n');

    try {
      const llm = this.llmFactory
        .getChatModel()
        .withStructuredOutput(queryIntentOutputSchema);
      const result = await llm.invoke([new HumanMessage(prompt)]);
      return {
        isFollowUp: result.isFollowUp,
        intent: result.intent,
        resolvedQuery: result.resolvedQuery.trim(),
        ...(hasFlightListCriteria(result.flightListCriteria)
          ? { flightListCriteria: result.flightListCriteria }
          : {}),
        ...(hasProductListCriteria(result.productListCriteria)
          ? { productListCriteria: result.productListCriteria }
          : {}),
      };
    } catch (err) {
      this.logger.warn(
        `Query intent classification failed: ${(err as Error).message}`,
      );
      return {
        isFollowUp: false,
        intent: 'direct',
        resolvedQuery: userMessage.trim(),
      };
    }
  }
}

function buildFlightListClassifierSummary(flightListContext: FlightListContext): string {
  const flights = flightListContext.flights
    .filter((flight) => flight.rawText?.trim())
    .slice(0, 25)
    .map((flight) => {
      const fields = [
        `#${flight.index}`,
        flight.airline ? `airline=${truncateForPrompt(flight.airline, 42)}` : null,
        flight.price ? `price=${flight.price}` : null,
        flight.refundability ? `refundability=${flight.refundability}` : null,
        flight.stops ? `stops=${flight.stops}` : null,
        `text=${truncateForPrompt(flight.rawText, 120)}`,
      ].filter(Boolean);
      return fields.join(' | ');
    });

  return flights.length > 0
    ? `Visible flight summary:\n${flights.join('\n')}`
    : 'Visible flight summary: none';
}

function buildProductListClassifierSummary(productListContext: ProductListContext): string {
  const products = productListContext.products
    .filter((p) => p.rawText?.trim())
    .slice(0, 25)
    .map((p) => {
      const fields = [
        `#${p.index}`,
        p.name ? `name=${truncateForPrompt(p.name, 60)}` : null,
        p.price ? `price=${p.price}` : null,
        p.discount ? `discount=${p.discount}` : null,
        p.rating ? `rating=${p.rating}` : null,
        p.availability ? `availability=${p.availability}` : null,
        p.brand ? `brand=${truncateForPrompt(p.brand, 40)}` : null,
        `text=${truncateForPrompt(p.rawText, 100)}`,
      ].filter(Boolean);
      return fields.join(' | ');
    });

  return products.length > 0
    ? `Visible product summary:\n${products.join('\n')}`
    : 'Visible product summary: none';
}

function truncateForPrompt(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1)}...`;
}
