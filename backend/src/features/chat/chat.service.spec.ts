import { ChatService } from "./chat.service";
import { ChatMessage } from "./chat-message.entity";
import * as fs from "fs";
import * as path from "path";

const FALLBACK_MESSAGE =
  "That's outside the scope of what I can help with here. I'm only able to answer questions based on the available knowledge base - feel free to ask me anything related to it!";
const USAGE_SNAPSHOT = {
  plan: { id: 1, name: "free", monthlyMessageLimit: 50 },
  periodStart: "2026-05-01",
  periodEnd: "2026-06-01",
  usedMessages: 1,
  remainingMessages: 49
};

type MockChatRepo = {
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function makeMessage(
  content: string,
  role: "assistant" | "user" = "user"
): ChatMessage {
  return {
    id: content,
    sessionId: "session-1",
    userId: "user-1",
    role,
    content,
    createdAt: new Date()
  };
}

function createService() {
  const chatRepo: MockChatRepo = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn().mockResolvedValue(undefined)
  };
  const aiService = {
    classifyQueryIntent: jest.fn().mockImplementation(
      async (_history, currentMessage) => ({
        isFollowUp: false,
        intent: "direct",
        resolvedQuery: currentMessage
      })
    ),
    embedText: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    analyzeVisibleFlightContext: jest.fn().mockReturnValue({
      answer: "Visible flight answer"
    }),
    runAgenticLoop: jest.fn().mockResolvedValue({ answer: "Agent answer" })
  };
  const cacheService = {
    findHit: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined)
  };
  const companyService = {
    getActive: jest.fn().mockResolvedValue(null)
  };
  const retrievalService = {
    hasRelevantKnowledge: jest.fn().mockResolvedValue(true)
  };
  const usageService = {
    incrementOrThrow: jest.fn().mockResolvedValue(USAGE_SNAPSHOT)
  };
  const chatToolsService = {
    list: jest.fn().mockResolvedValue([])
  };

  const service = new ChatService(
    chatRepo as never,
    {} as never,
    aiService as never,
    cacheService as never,
    companyService as never,
    retrievalService as never,
    usageService as never,
    chatToolsService as never
  );
  service.onModuleInit();

  return {
    service,
    chatRepo,
    aiService,
    cacheService,
    companyService,
    retrievalService,
    usageService,
    chatToolsService
  };
}

describe("ChatService", () => {
  it("uses recent conversation context for follow-up retrieval and cache queries", async () => {
    const { service, chatRepo, aiService, cacheService, retrievalService } =
      createService();
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "follow_up",
      resolvedQuery: "Flights Nepal office location address physical address branch contact"
    });
    chatRepo.find.mockResolvedValue([
      makeMessage(
        "Flights Nepal can be contacted by phone and email.",
        "assistant"
      ),
      makeMessage("I want to contact Flights Nepal", "user")
    ]);

    const result = await service.chat(
      "their office location?",
      "session-1",
      "user-1"
    );

    expect(result).toEqual({
      answer: "Agent answer",
      cached: false,
      usage: USAGE_SNAPSHOT
    });

    const contextualQuery = aiService.embedText.mock.calls[0][0] as string;
    expect(contextualQuery).toContain("Flights Nepal");
    expect(contextualQuery).toContain("office location");
    expect(retrievalService.hasRelevantKnowledge).toHaveBeenCalledWith(
      [0.1, 0.2, 0.3],
      "user-1"
    );
    expect(cacheService.save.mock.calls[0][0]).toBe(contextualQuery);
    expect(cacheService.save.mock.calls[0][2]).toBe("Agent answer");
  });

  it("rewrites contact number follow-ups with the latest user subject", async () => {
    const { service, chatRepo, aiService, cacheService, retrievalService } =
      createService();
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "follow_up",
      resolvedQuery: "Flights Nepal contact number phone helpline WhatsApp"
    });
    chatRepo.find.mockResolvedValue([
      makeMessage("tell me about flights nepal", "user"),
      makeMessage("Flights Nepal is a flight booking service.", "assistant")
    ]);

    await service.chat("contact number?", "session-1", "user-1");

    expect(aiService.embedText).toHaveBeenCalledWith(
      expect.stringContaining(
        "Flights Nepal contact number phone helpline WhatsApp"
      )
    );
    expect(retrievalService.hasRelevantKnowledge).toHaveBeenCalledWith(
      [0.1, 0.2, 0.3],
      "user-1"
    );
    expect(cacheService.findHit).toHaveBeenCalledWith(
      [0.1, 0.2, 0.3],
      "user-1"
    );
    expect(cacheService.save.mock.calls[0][0]).toContain(
      "Flights Nepal contact number phone"
    );
    expect(aiService.runAgenticLoop).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      "contact number?",
      "user-1",
      expect.stringContaining("Flights Nepal contact number phone"),
      [],
      undefined
    );
  });

  it("resolves contact number follow-ups from prior assistant contact details", async () => {
    const { service, chatRepo, aiService } = createService();
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "follow_up",
      resolvedQuery: "Flights Nepal contact number phone helpline WhatsApp"
    });
    chatRepo.find.mockResolvedValue([
      makeMessage("their office location?", "user"),
      makeMessage(
        "### 1. Flights Nepal Office Location\nFlights Nepal has an office in Thamel.\n### 3. Contact Information\nPhone Numbers: 014700922",
        "assistant"
      )
    ]);

    await service.chat("contact number?", "session-1", "user-1");

    expect(aiService.embedText).toHaveBeenCalledWith(
      expect.stringContaining(
        "Flights Nepal contact number phone helpline WhatsApp"
      )
    );
  });

  it.each([
    ["email?", "Flights Nepal email support contact"],
    ["office hours?", "Flights Nepal office hours opening hours hours"],
    ["website?", "Flights Nepal website url link"]
  ])("rewrites %s with the latest subject", async (message, expectedQuery) => {
    const { service, chatRepo, aiService } = createService();
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "follow_up",
      resolvedQuery: expectedQuery
    });
    chatRepo.find.mockResolvedValue([
      makeMessage("tell me about Flights Nepal", "user"),
      makeMessage("Flights Nepal is a travel booking platform.", "assistant")
    ]);

    await service.chat(message, "session-1", "user-1");

    expect(aiService.embedText).toHaveBeenCalledWith(
      expect.stringContaining(expectedQuery)
    );
  });

  it("asks for clarification for unresolved follow-up references", async () => {
    const { service, chatRepo, aiService, cacheService, retrievalService } =
      createService();
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "clarification_needed",
      resolvedQuery: ""
    });
    chatRepo.find.mockResolvedValue([]);

    const result = await service.chat(
      "their office location?",
      "session-1",
      "user-1"
    );

    expect(result).toEqual({
      answer: "Which company or organization do you mean?",
      cached: false,
      usage: USAGE_SNAPSHOT
    });
    expect(aiService.embedText).not.toHaveBeenCalled();
    expect(aiService.runAgenticLoop).not.toHaveBeenCalled();
    expect(cacheService.findHit).not.toHaveBeenCalled();
    expect(retrievalService.hasRelevantKnowledge).not.toHaveBeenCalled();
  });

  it("does not treat generic small talk as useful follow-up context", async () => {
    const { service, chatRepo, aiService } = createService();
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "clarification_needed",
      resolvedQuery: ""
    });
    chatRepo.find.mockResolvedValue([
      makeMessage("Hello! How can I help?", "assistant"),
      makeMessage("hi", "user")
    ]);

    const result = await service.chat(
      "their office location?",
      "session-1",
      "user-1"
    );

    expect(result).toEqual({
      answer: "Which company or organization do you mean?",
      cached: false,
      usage: USAGE_SNAPSHOT
    });
    expect(aiService.embedText).not.toHaveBeenCalled();
  });

  it("asks for clarification for unresolved elliptical follow-ups", async () => {
    const { service, chatRepo, aiService, cacheService, retrievalService } =
      createService();
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "clarification_needed",
      resolvedQuery: ""
    });
    chatRepo.find.mockResolvedValue([]);

    const result = await service.chat("contact number?", "session-1", "user-1");

    expect(result).toEqual({
      answer: "Which company or organization do you mean?",
      cached: false,
      usage: USAGE_SNAPSHOT
    });
    expect(aiService.embedText).not.toHaveBeenCalled();
    expect(aiService.runAgenticLoop).not.toHaveBeenCalled();
    expect(cacheService.findHit).not.toHaveBeenCalled();
    expect(retrievalService.hasRelevantKnowledge).not.toHaveBeenCalled();
  });

  it("treats standalone terms requests as knowledge page lookups", async () => {
    const { service, chatRepo, aiService, retrievalService } = createService();
    chatRepo.find.mockResolvedValue([]);
    retrievalService.hasRelevantKnowledge.mockResolvedValue(false);
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: false,
      intent: "standalone_knowledge_page",
      resolvedQuery:
        "terms and condition terms condition terms conditions using platform termination liability contact"
    });

    const result = await service.chat(
      "Terms and condition",
      "session-1",
      "user-1"
    );

    expect(result).toEqual({
      answer: "Agent answer",
      cached: false,
      usage: USAGE_SNAPSHOT
    });
    expect(aiService.embedText).toHaveBeenCalledWith(
      "terms and condition terms condition terms conditions using platform termination liability contact"
    );
    expect(retrievalService.hasRelevantKnowledge).not.toHaveBeenCalled();
    expect(aiService.runAgenticLoop).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      "Terms and condition",
      "user-1",
      "terms and condition terms condition terms conditions using platform termination liability contact",
      [],
      undefined
    );
  });

  it("uses the active company profile as context for follow-up references", async () => {
    const { service, chatRepo, aiService, companyService } = createService();
    chatRepo.find.mockResolvedValue([]);
    companyService.getActive.mockResolvedValue({
      name: "Flights Nepal",
      shortDescription: "Travel booking support"
    });
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: true,
      intent: "follow_up",
      resolvedQuery: "Flights Nepal office location address physical address branch contact"
    });

    await service.chat("their office location?", "session-1", "user-1");

    expect(aiService.embedText).toHaveBeenCalledWith(
      "Flights Nepal office location address physical address branch contact"
    );
  });

  it("loads the newest stored messages before restoring chronological history", async () => {
    const { service, chatRepo, aiService, retrievalService } = createService();
    retrievalService.hasRelevantKnowledge.mockResolvedValue(false);
    chatRepo.find.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => makeMessage(`message-${24 - i}`))
    );

    await service.chat("what details are available?", "session-1", "user-1");

    expect(chatRepo.find).toHaveBeenCalledWith({
      where: { sessionId: "session-1", userId: "user-1" },
      order: { createdAt: "DESC" },
      take: 20
    });

    const classifierHistory = aiService.classifyQueryIntent.mock.calls[0][0];
    const classifierText = classifierHistory
      .map((m) => m.parts.map((p) => p.text ?? "").join(""))
      .join("\n");
    expect(classifierText).toContain("message-24");
    expect(classifierText).toContain("message-5");
    expect(classifierText).not.toContain("message-4");
    expect(classifierText).not.toContain("message-0");
  });

  it("does not cache fallback answers", async () => {
    const { service, chatRepo, aiService, cacheService } = createService();
    chatRepo.find.mockResolvedValue([]);
    aiService.runAgenticLoop.mockResolvedValue({ answer: FALLBACK_MESSAGE });

    const result = await service.chat(
      "what is unrelated?",
      "session-1",
      "user-1"
    );

    expect(result).toEqual({
      answer: FALLBACK_MESSAGE,
      cached: false,
      usage: USAGE_SNAPSHOT
    });
    expect(cacheService.save).not.toHaveBeenCalled();
  });

  it("lets enabled redirect tools run through the agent and does not cache them", async () => {
    const {
      service,
      chatRepo,
      aiService,
      cacheService,
      retrievalService,
      chatToolsService
    } = createService();
    chatRepo.find.mockResolvedValue([]);
    chatToolsService.list.mockResolvedValue([
      {
        toolKey: "live_agent_contact",
        enabled: true,
        config: { redirectUrl: "https://wa.me/8801000000000" }
      }
    ]);
    retrievalService.hasRelevantKnowledge.mockResolvedValue(false);
    aiService.runAgenticLoop.mockResolvedValue({
      answer: "Redirecting to Live Agent",
      action: {
        type: "redirect",
        target: "new_tab",
        url: "https://wa.me/8801000000000",
        delayMs: 1200
      }
    });

    const result = await service.chat(
      "I want to talk to a real agent",
      "session-1",
      "user-1"
    );

    expect(result).toEqual({
      answer: "Redirecting to Live Agent",
      cached: false,
      usage: USAGE_SNAPSHOT,
      action: {
        type: "redirect",
        target: "new_tab",
        url: "https://wa.me/8801000000000",
        delayMs: 1200
      }
    });
    expect(chatRepo.save).toHaveBeenCalled();
    expect(aiService.embedText).toHaveBeenCalled();
    expect(retrievalService.hasRelevantKnowledge).toHaveBeenCalled();
    expect(cacheService.findHit).not.toHaveBeenCalled();
    expect(cacheService.save).not.toHaveBeenCalled();
    expect(aiService.runAgenticLoop).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      "I want to talk to a real agent",
      "user-1",
      undefined,
      [
        {
          toolKey: "live_agent_contact",
          enabled: true,
          config: { redirectUrl: "https://wa.me/8801000000000" }
        }
      ],
      undefined
    );
  });

  it("does not cache flight tool answers even when no redirect action is returned", async () => {
    const {
      service,
      chatRepo,
      aiService,
      cacheService,
      retrievalService,
      chatToolsService
    } = createService();
    chatRepo.find.mockResolvedValue([]);
    chatToolsService.list.mockResolvedValue([
      {
        toolKey: "flight_search",
        enabled: true,
        config: {
          oneWayTemplateUrl: "https://example.com/flights?trips=DAC,DXB,2026-12-12",
          roundTripTemplateUrl: "https://example.com/flights?trips=DAC,DXB,2026-12-12%7CDXB,DAC,2026-12-20",
          multiCityTemplateUrl: "https://example.com/flights?trips=DAC,DXB,2026-12-12"
        }
      }
    ]);
    retrievalService.hasRelevantKnowledge.mockResolvedValue(false);
    aiService.runAgenticLoop.mockResolvedValue({
      answer: "Which destination airport do you prefer?",
      usedToolKeys: ["city_to_airport"]
    });

    const result = await service.chat(
      "dhaka to london flight",
      "session-1",
      "user-1"
    );

    expect(result).toEqual({
      answer: "Which destination airport do you prefer?",
      cached: false,
      usage: USAGE_SNAPSHOT
    });
    expect(cacheService.findHit).not.toHaveBeenCalled();
    expect(cacheService.save).not.toHaveBeenCalled();
  });

  it("directly analyzes visible flights when classification is flight list query", async () => {
    const {
      service,
      chatRepo,
      aiService,
      cacheService,
      retrievalService,
      chatToolsService
    } = createService();
    const flightListContext = {
      type: "flight_list" as const,
      url: "https://ota.example/flights",
      totalFlights: 2,
      flights: [
        {
          index: 1,
          rawText: "Example Air DAC DXB 5h 10m USD 420 20kg",
          origin: "DAC",
          destination: "DXB",
          price: "USD 420",
          baggage: "20kg",
          airline: "Example Air",
          duration: "5h 10m",
          departure: null,
          arrival: null,
          stops: null
        },
        {
          index: 2,
          rawText: "Budget Air DAC DXB 6h USD 390 15kg",
          origin: "DAC",
          destination: "DXB",
          price: "USD 390",
          baggage: "15kg",
          airline: "Budget Air",
          duration: "6h",
          departure: null,
          arrival: null,
          stops: null
        }
      ]
    };
    chatRepo.find.mockResolvedValue([]);
    chatToolsService.list.mockResolvedValue([
      {
        toolKey: "flight_search",
        enabled: true,
        config: {
          oneWayTemplateUrl: "https://example.com/flights?trips=DAC,DXB,2026-12-12"
        }
      }
    ]);
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: false,
      intent: "flight_list_query",
      resolvedQuery: "find cheapest visible flight"
    });
    aiService.analyzeVisibleFlightContext.mockReturnValueOnce({
      answer: "This is the cheapest flight: Budget Air for USD 390.",
      dommanipulate: {
        type: "highlight_flight_card",
        flightIndex: 2,
        label: "Cheapest flight"
      }
    });

    const result = await service.chat(
      "Find me cheapest flight",
      "session-1",
      "user-1",
      flightListContext
    );

    expect(result).toEqual({
      answer: "This is the cheapest flight: Budget Air for USD 390.",
      cached: false,
      usage: USAGE_SNAPSHOT,
      dommanipulate: {
        type: "highlight_flight_card",
        flightIndex: 2,
        label: "Cheapest flight"
      }
    });
    expect(retrievalService.hasRelevantKnowledge).not.toHaveBeenCalled();
    expect(aiService.embedText).not.toHaveBeenCalled();
    expect(cacheService.findHit).not.toHaveBeenCalled();
    expect(cacheService.save).not.toHaveBeenCalled();
    expect(aiService.runAgenticLoop).not.toHaveBeenCalled();
    expect(aiService.classifyQueryIntent).toHaveBeenCalledWith(
      expect.any(Array),
      "Find me cheapest flight",
      undefined,
      flightListContext
    );
    expect(aiService.analyzeVisibleFlightContext).toHaveBeenCalledWith(
      "find cheapest visible flight",
      flightListContext
    );
  });

  it("does not expose tools or retrieval when directly analyzing visible flight queries", async () => {
    const {
      service,
      chatRepo,
      aiService,
      cacheService,
      retrievalService,
      chatToolsService
    } = createService();
    const flightListContext = {
      type: "flight_list" as const,
      totalFlights: 1,
      flights: [
        {
          index: 1,
          rawText: "Emirates DAC DXB BDT 8200",
          airline: "Emirates"
        }
      ]
    };
    chatRepo.find.mockResolvedValue([]);
    chatToolsService.list.mockResolvedValue([
      {
        toolKey: "flight_search",
        enabled: true,
        config: {
          oneWayTemplateUrl: "https://example.com/flights"
        }
      },
      {
        toolKey: "live_agent_contact",
        enabled: true,
        config: {
          redirectUrl: "https://wa.me/8801000000000"
        }
      }
    ]);
    aiService.classifyQueryIntent.mockResolvedValueOnce({
      isFollowUp: false,
      intent: "flight_list_query",
      resolvedQuery: "fly emirat flights"
    });
    aiService.analyzeVisibleFlightContext.mockReturnValueOnce({
      answer: "These are the Emirates flights.",
      dommanipulate: {
        type: "highlight_flight_cards",
        flightIndexes: [1],
        label: "Emirates flights"
      }
    });

    const result = await service.chat(
      "fly emirat flights",
      "session-1",
      "user-1",
      flightListContext
    );

    expect(result).toEqual({
      answer: "These are the Emirates flights.",
      cached: false,
      usage: USAGE_SNAPSHOT,
      dommanipulate: {
        type: "highlight_flight_cards",
        flightIndexes: [1],
        label: "Emirates flights"
      }
    });
    expect(aiService.analyzeVisibleFlightContext).toHaveBeenCalledWith(
      "fly emirat flights",
      flightListContext
    );
    expect(aiService.runAgenticLoop).not.toHaveBeenCalled();
    expect(aiService.embedText).not.toHaveBeenCalled();
    expect(cacheService.findHit).not.toHaveBeenCalled();
    expect(retrievalService.hasRelevantKnowledge).not.toHaveBeenCalled();
  });

  it("does not save or answer when the monthly message quota is exceeded", async () => {
    const { service, chatRepo, usageService, aiService } = createService();
    usageService.incrementOrThrow.mockRejectedValue(
      new Error("quota exceeded")
    );

    await expect(service.chat("hello", "session-1", "user-1")).rejects.toThrow(
      "quota exceeded"
    );

    expect(chatRepo.find).not.toHaveBeenCalled();
    expect(chatRepo.save).not.toHaveBeenCalled();
    expect(aiService.embedText).not.toHaveBeenCalled();
  });
});

describe("chat system prompt", () => {
  it("guides contextual location/contact follow-up retrieval and fallback behavior", () => {
    const prompt = fs.readFileSync(
      path.join(__dirname, "prompts", "system.prompt.txt"),
      "utf-8"
    );

    expect(prompt).toContain("standalone search query");
    expect(prompt).toContain(
      "Flights Nepal office location address physical address contact branch"
    );
    expect(prompt).toContain("contact number?");
    expect(prompt).toContain("office hours?");
    expect(prompt).toContain("ask a concise clarification question");
    expect(prompt).toContain("Tool workflow exception");
    expect(prompt).toContain("city_to_airport");
    expect(prompt).toContain("assume one-way");
    expect(prompt).toContain("use the Current year from the Runtime context");
    expect(prompt).toContain("do not ask for the year");
    expect(prompt).toContain("22th June");
    expect(prompt).toContain("Redirecting to flight page");
    expect(prompt).toContain("Redirecting to Live Agent");
    expect(prompt).toContain("Never mention source document names");
    expect(prompt).toContain("uploaded file names");
    expect(prompt).toContain(FALLBACK_MESSAGE);
  });
});
