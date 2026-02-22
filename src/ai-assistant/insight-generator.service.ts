import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DomainType } from './types/intent.enum';

const MAX_DATA_CHARS = 12_000;

@Injectable()
export class InsightGeneratorService {
  private readonly logger = new Logger(InsightGeneratorService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateInsight(
    question: string,
    data: unknown,
    domain: DomainType,
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(domain);
    let dataBlock = JSON.stringify(data, null, 2);

    if (dataBlock.length > MAX_DATA_CHARS) {
      dataBlock = dataBlock.slice(0, MAX_DATA_CHARS) + '\n... (truncated)';
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Query results:\n${dataBlock}\n\nUser question: ${question}`,
          },
        ],
        temperature: 1,
        max_completion_tokens: 4096,
      });

      return (
        completion.choices[0]?.message?.content?.trim() ||
        'Unable to generate a response. Please try again.'
      );
    } catch (error: any) {
      this.logger.error(`Insight generation failed: ${error.message}`);
      throw error;
    }
  }

  private buildSystemPrompt(domain: DomainType): string {
    const base = `You are a concise operational assistant for CryoCommand, a cold-chain logistics platform.
You are given database query results and a user question.
Answer ONLY based on the provided data. Do NOT invent or assume data that is not present.
If the data is insufficient to answer, say so explicitly.
Be brief, professional, and actionable.
IMPORTANT: Always respond in the same language as the user's question.`;

    const domainHints: Record<DomainType, string> = {
      [DomainType.FLEET]:
        'Context: fleet-wide operations — vehicle availability, utilization, temperature compliance.',
      [DomainType.VEHICLE]:
        'Context: individual vehicle metrics — temperature, status, last update, violations.',
      [DomainType.TRIP]:
        'Context: trip logistics — routes, delivery status, compliance, delays.',
      [DomainType.ALERT]:
        'Context: alerts and notifications — severity, resolution status, patterns.',
      [DomainType.COMPLIANCE]:
        'Context: regulatory compliance — standards, pass/fail evaluations, violation counts.',
      [DomainType.SENSOR]:
        'Context: IoT sensor data — temperature trends, humidity, reading frequency.',
      [DomainType.REPORT]:
        'Context: generated reports — historical data exports, report types and periods.',
      [DomainType.UNKNOWN]:
        'Context: general operational overview.',
    };

    return `${base}\n${domainHints[domain]}`;
  }
}
