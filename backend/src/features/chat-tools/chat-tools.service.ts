import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatToolConfig, ChatToolKey } from './chat-tool-config.entity';
import { CHAT_TOOL_KEYS, ChatToolConfigResponse } from './chat-tools.types';
import { UpdateChatToolConfigDto } from './dto/update-chat-tool-config.dto';

const DEFAULT_CONFIGS: Record<ChatToolKey, Record<string, unknown>> = {
  flight_search: {
    oneWayTemplateUrl: '',
    roundTripTemplateUrl: '',
    multiCityTemplateUrl: '',
  },
  live_agent_contact: {
    redirectUrl: '',
  },
};

@Injectable()
export class ChatToolsService {
  constructor(
    @InjectRepository(ChatToolConfig)
    private readonly repo: Repository<ChatToolConfig>,
  ) {}

  async list(userId: string): Promise<ChatToolConfigResponse[]> {
    const records = await this.repo.find({ where: { userId } });
    const byKey = new Map(records.map((record) => [record.toolKey, record]));

    return CHAT_TOOL_KEYS.map((toolKey) => {
      const record = byKey.get(toolKey);
      return {
        toolKey,
        enabled: record?.enabled ?? false,
        config: { ...DEFAULT_CONFIGS[toolKey], ...(record?.config ?? {}) },
        createdAt: record?.createdAt,
        updatedAt: record?.updatedAt,
      };
    });
  }

  async get(userId: string, toolKey: ChatToolKey): Promise<ChatToolConfigResponse> {
    const record = await this.repo.findOne({ where: { userId, toolKey } });
    return {
      toolKey,
      enabled: record?.enabled ?? false,
      config: { ...DEFAULT_CONFIGS[toolKey], ...(record?.config ?? {}) },
      createdAt: record?.createdAt,
      updatedAt: record?.updatedAt,
    };
  }

  async update(
    userId: string,
    toolKey: ChatToolKey,
    dto: UpdateChatToolConfigDto,
  ): Promise<ChatToolConfigResponse> {
    const current = await this.repo.findOne({ where: { userId, toolKey } });
    const config = {
      ...DEFAULT_CONFIGS[toolKey],
      ...(current?.config ?? {}),
      ...(dto.config ?? {}),
    };

    this.validateConfig(toolKey, Boolean(dto.enabled ?? current?.enabled), config);

    const saved = await this.repo.save(
      this.repo.create({
        id: current?.id,
        userId,
        toolKey,
        enabled: dto.enabled ?? current?.enabled ?? false,
        config,
      }),
    );

    return {
      toolKey: saved.toolKey,
      enabled: saved.enabled,
      config: { ...DEFAULT_CONFIGS[toolKey], ...saved.config },
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  private validateConfig(
    toolKey: ChatToolKey,
    enabled: boolean,
    config: Record<string, unknown>,
  ) {
    if (!enabled) return;

    if (toolKey === 'live_agent_contact') {
      this.requireHttpUrl(config.redirectUrl, 'Live agent redirect URL');
      return;
    }

    this.requireHttpUrl(config.oneWayTemplateUrl, 'One-way template URL');
    this.requireHttpUrl(config.roundTripTemplateUrl, 'Round-trip template URL');
    this.requireHttpUrl(config.multiCityTemplateUrl, 'Multicity template URL');
  }

  private requireHttpUrl(value: unknown, label: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${label} is required when enabling this tool`);
    }

    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Unsupported protocol');
      }
    } catch {
      throw new BadRequestException(`${label} must be a valid http or https URL`);
    }
  }
}
