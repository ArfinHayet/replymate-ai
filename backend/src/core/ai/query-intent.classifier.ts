import { Injectable, Logger } from '@nestjs/common';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { LlmFactoryService } from '../llm/llm-factory.service';
import type { Message, QueryIntentClassification } from './ai.types';

const queryIntentOutputSchema = z.object({
  isFollowUp: z.boolean().describe(
    'True when the user message depends on a previous subject or context.',
  ),
  intent: z.enum([
    'direct',
    'follow_up',
    'standalone_knowledge_page',
    'clarification_needed',
  ]),
  resolvedQuery: z.string().describe(
    'A standalone retrieval/search query. Use an empty string only when clarification is needed.',
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
    pendingClarificationQuestion?: string,
  ): Promise<QueryIntentClassification> {
    const recentHistory = history
      .slice(-8)
      .map((message) => {
        const role = message.role === 'user' ? 'User' : 'Assistant';
        const text = message.parts.map((part) => part.text ?? '').join('').trim();
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
      '- standalone_knowledge_page: the user asks for a common website page such as terms, privacy, refund, returns, FAQ, about us, or contact us.',
      '- clarification_needed: the message is a follow-up, but no subject can be resolved from history or the active company profile.',
      '',
      'Rules:',
      '- For follow_up, resolve the missing subject from recent history first, then the active company profile.',
      '- If a pending clarification exists and the current message supplies its missing company or organization, treat it as the answer to that clarification and combine it with the original unanswered question when building resolvedQuery.',
      '- If the current message is clearly a separate standalone request, classify it normally and do not combine it with the pending question.',
      '- If the current message still does not identify the missing subject, return clarification_needed with an empty resolvedQuery.',
      '- For standalone_knowledge_page, do not mark it as a follow-up. Build a rich retrieval query with the page title and likely section words.',
      '- For direct and follow_up, resolvedQuery should be the best concise standalone retrieval query.',
      '- For clarification_needed, resolvedQuery must be an empty string.',
      '',
      activeCompanyName ? `Active company profile: ${activeCompanyName}` : 'Active company profile: none',
      pendingClarificationQuestion
        ? `Pending clarification. The assistant asked "Which company or organization do you mean?" for the original unanswered user question: ${pendingClarificationQuestion}`
        : 'Pending clarification: none',
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
      };
    } catch (err) {
      this.logger.warn(
        `Query intent classification failed: ${(err as Error).message}`,
      );
      if (pendingClarificationQuestion?.trim()) {
        return {
          isFollowUp: true,
          intent: 'follow_up',
          resolvedQuery: [userMessage.trim(), pendingClarificationQuestion.trim()]
            .filter(Boolean)
            .join(' '),
        };
      }
      return {
        isFollowUp: false,
        intent: 'direct',
        resolvedQuery: userMessage.trim(),
      };
    }
  }
}
