/** History shape shared with ChatService. */
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
    | 'clarification_needed';
  resolvedQuery: string;
};

export type AgenticLoopResult = {
  answer: string;
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
