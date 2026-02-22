import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { QueryGeneratorService } from './query-generator.service';
import { QueryExecutorService } from './query-executor.service';
import { InsightGeneratorService } from './insight-generator.service';
import { jwtConfig } from '../config/jwt.config';

@Module({
  imports: [JwtModule.registerAsync(jwtConfig)],
  controllers: [AiAssistantController],
  providers: [
    AiAssistantService,
    QueryGeneratorService,
    QueryExecutorService,
    InsightGeneratorService,
  ],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}
