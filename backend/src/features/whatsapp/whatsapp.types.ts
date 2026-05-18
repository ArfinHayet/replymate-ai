import type { Request } from 'express';

export type WhatsappWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          profile?: { name?: string };
          wa_id?: string;
        }>;
        messages?: WhatsappInboundMessage[];
        statuses?: Array<Record<string, unknown>>;
      };
    }>;
  }>;
};

export type WhatsappInboundMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

export type RawBodyRequest = Request & {
  rawBody?: Buffer;
};
