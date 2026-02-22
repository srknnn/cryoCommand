import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { QueryGeneratorService } from './query-generator.service';
import { QueryExecutorService } from './query-executor.service';
import { InsightGeneratorService } from './insight-generator.service';
import { QueryResponseDto } from './dto';
import { ActionType } from './types/intent.enum';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryGenerator: QueryGeneratorService,
    private readonly queryExecutor: QueryExecutorService,
    private readonly insightGenerator: InsightGeneratorService,
  ) {}

  async query(userId: string, question: string): Promise<QueryResponseDto> {
    const querySpec = await this.queryGenerator.generateQuery(question);
    this.logger.log(
      `[Orchestrator] Generated query → ${querySpec.model}.${querySpec.action}`,
    );

    const queryResult = await this.queryExecutor.execute(querySpec);
    this.logger.log(
      `[Orchestrator] Query returned ${queryResult.recordCount} record(s) from ${queryResult.model}`,
    );

    const answer = await this.insightGenerator.generateInsight(
      question,
      queryResult.data,
      queryResult.domain,
    );

    await this.saveConversation(userId, question, answer);

    return {
      answer,
      domain: queryResult.domain,
      action: querySpec.action === 'count' ? ActionType.OVERVIEW : ActionType.DETAIL,
      data_sources: [queryResult.model],
    };
  }

  private async saveConversation(
    userId: string,
    question: string,
    answer: string,
  ): Promise<void> {
    await this.prisma.assistantConversation.create({
      data: {
        visibleId: uuidv4(),
        user_id: userId,
        question,
        answer,
        created_at: new Date(),
      },
    });
  }
}
