import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

@Injectable()
export class LlmFactoryService {
    constructor(private readonly config: ConfigService) { }

    getChatModel(): BaseChatModel {
        const provider = this.config.get<string>('llm.chat.provider')!;
        const apiKey = this.config.get<string>('llm.chat.apiKey')!;
        const model = this.config.get<string>('llm.chat.model')!;

        switch (provider) {
            case 'openai': return new ChatOpenAI({ apiKey, model });
            case 'anthropic': return new ChatAnthropic({ apiKey, model });
            default: return new ChatGoogleGenerativeAI({ apiKey, model });
        }
    }

    getEmbeddings(): Embeddings {
        const provider = this.config.get<string>('llm.embedding.provider')!;
        const apiKey = this.config.get<string>('llm.embedding.apiKey')!;
        const model = this.config.get<string>('llm.embedding.model')!;

        switch (provider) {
            case 'openai': return new OpenAIEmbeddings({ apiKey, model });
            default: return new GoogleGenerativeAIEmbeddings({ apiKey, model });
        }
    }
}
