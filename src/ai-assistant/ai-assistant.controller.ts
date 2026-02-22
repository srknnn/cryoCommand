import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { QueryDto, QueryResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IUser } from '../common/interfaces/user.interface';

@Controller('assistant')
@UseGuards(JwtAuthGuard)
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  /**
   * AI Assistant query
   * POST /api/assistant/query
   *
   * Aggregates analytics from DB, sends structured summary to OpenAI,
   * returns the generated answer, and saves the conversation.
   */
  @Post('query')
  async query(
    @Body() dto: QueryDto,
    @CurrentUser() user: IUser,
  ): Promise<QueryResponseDto> {
    return this.aiAssistantService.query(user.id, dto.question);
  }
}
