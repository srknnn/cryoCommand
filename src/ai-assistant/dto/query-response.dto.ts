import { DomainType, ActionType } from '../types/intent.enum';

export class QueryResponseDto {
  answer: string;
  domain: DomainType;
  action: ActionType;
  data_sources: string[];
}
