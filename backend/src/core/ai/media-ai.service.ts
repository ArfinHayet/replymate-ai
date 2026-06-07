import { Injectable, Logger } from '@nestjs/common';
import { HumanMessage, type MessageContentComplex } from '@langchain/core/messages';
import { z } from 'zod';
import { LlmFactoryService } from '../llm/llm-factory.service';

const analyzeOutputSchema = z.object({
  title: z.string().describe('A concise title (5-10 words) for the image'),
  description: z.string().describe('A 2-3 sentence factual description of the image'),
});

@Injectable()
export class MediaAiService {
  private readonly logger = new Logger(MediaAiService.name);

  constructor(private readonly llmFactory: LlmFactoryService) {}

  async analyzeImage(
    base64: string,
    mimeType: string,
  ): Promise<{ title: string; description: string }> {
    const llm = this.llmFactory.getChatModel().withStructuredOutput(analyzeOutputSchema);

    const result = await llm.invoke([
      new HumanMessage({
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Generate a concise title (5-10 words) and a 2-3 sentence factual description for this image.',
          },
        ],
      }),
    ]);

    this.logger.log(`Image analyzed: "${result.title}"`);
    return result;
  }

  async extractTextFromPdf(buffer: Buffer, fileName: string): Promise<string> {
    const modelName = this.llmFactory.getChatModelName();

    try {
      this.logger.log(`AI PDF extraction started for ${fileName} using ${modelName}`);
      const llm = this.llmFactory.getChatModel();
      const pdfContent: MessageContentComplex[] = [
        {
          type: 'application/pdf',
          data: buffer.toString('base64'),
        },
        {
          type: 'text',
          text:
            'Extract all readable text from this PDF for document search. ' +
            'Preserve names, headings, dates, contact details, bullet points, and section order. ' +
            'Return only the extracted text. If there is no readable text, return an empty response.',
        },
      ];

      const result = await llm.invoke([
        new HumanMessage({
          content: pdfContent as never,
        }),
      ]);

      const extractedText = this.extractMessageText(result.content).trim();
      this.logger.log(
        `AI PDF extraction returned ${extractedText.length} characters for ${fileName}`,
      );
      return extractedText;
    } catch (err) {
      this.logger.warn(
        `AI PDF extraction failed for ${fileName} using ${modelName}: ${(err as Error).message}`,
      );
      return '';
    }
  }

  private extractMessageText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';

    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          part.type === 'text' &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text;
        }
        return '';
      })
      .join('');
  }
}
