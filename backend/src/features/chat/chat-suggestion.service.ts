import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSuggestion } from './chat-suggestion.entity';

const MAX_SUGGESTIONS = 3;
const MAX_SUGGESTION_LENGTH = 120;

@Injectable()
export class ChatSuggestionService {
  constructor(
    @InjectRepository(ChatSuggestion)
    private readonly repo: Repository<ChatSuggestion>,
  ) {}

  async get(userId: string): Promise<string[]> {
    const record = await this.repo.findOne({ where: { userId } });
    return record?.suggestions ?? [];
  }

  async update(userId: string, suggestions: unknown): Promise<string[]> {
    const normalized = this.normalizeSuggestions(suggestions);
    const current = await this.repo.findOne({ where: { userId } });

    await this.repo.save(
      this.repo.create({
        id: current?.id,
        userId,
        suggestions: normalized,
      }),
    );

    return normalized;
  }

  private normalizeSuggestions(value: unknown): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException('suggestions must be an array');
    }

    const suggestions = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);

    if (suggestions.length > MAX_SUGGESTIONS) {
      throw new BadRequestException(`You can add up to ${MAX_SUGGESTIONS} suggestions`);
    }

    for (const suggestion of suggestions) {
      if (suggestion.length > MAX_SUGGESTION_LENGTH) {
        throw new BadRequestException(
          `Each suggestion must be ${MAX_SUGGESTION_LENGTH} characters or less`,
        );
      }
    }

    return Array.from(new Set(suggestions));
  }
}
