import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaQuerySpec, PostFilter } from './query-generator.service';
import { DomainType } from './types/intent.enum';

const ALLOWED_MODELS = new Set([
  'vehicle',
  'trip',
  'alert',
  'sensorReading',
  'complianceResult',
  'complianceStandard',
  'vehicleRiskSnapshot',
  'tripRiskSnapshot',
  'report',
]);

const ALLOWED_ACTIONS = new Set(['findMany', 'count']);

const MAX_TAKE = 50;
const DEFAULT_TAKE = 20;

const MODEL_TO_DOMAIN: Record<string, DomainType> = {
  vehicle: DomainType.VEHICLE,
  trip: DomainType.TRIP,
  alert: DomainType.ALERT,
  sensorReading: DomainType.SENSOR,
  complianceResult: DomainType.COMPLIANCE,
  complianceStandard: DomainType.COMPLIANCE,
  vehicleRiskSnapshot: DomainType.VEHICLE,
  tripRiskSnapshot: DomainType.TRIP,
  report: DomainType.REPORT,
};

export interface QueryResult {
  domain: DomainType;
  data: unknown;
  model: string;
  recordCount: number;
}

@Injectable()
export class QueryExecutorService {
  private readonly logger = new Logger(QueryExecutorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(spec: PrismaQuerySpec): Promise<QueryResult> {
    this.validate(spec);

    const delegate = (this.prisma as any)[spec.model];
    if (!delegate) {
      throw new BadRequestException(
        `Model "${spec.model}" not found in Prisma client`,
      );
    }

    const params = this.sanitizeParams(spec);

    this.logger.log(
      `Executing: ${spec.model}.${spec.action}(${JSON.stringify(params)})`,
    );

    let data: unknown;

    if (spec.action === 'count') {
      data = await delegate.count({ where: params.where ?? {} });
    } else {
      let results = await delegate.findMany(params);

      if (spec.postFilter?.conditions?.length) {
        results = this.applyPostFilter(results, spec.postFilter);
      }

      data = results;
    }

    const recordCount =
      spec.action === 'count'
        ? (data as number)
        : Array.isArray(data)
          ? data.length
          : 1;

    this.logger.log(
      `Query result: ${spec.model} → ${recordCount} record(s)`,
    );

    return {
      domain: MODEL_TO_DOMAIN[spec.model] ?? DomainType.UNKNOWN,
      data,
      model: spec.model,
      recordCount,
    };
  }

  private validate(spec: PrismaQuerySpec): void {
    if (!ALLOWED_MODELS.has(spec.model)) {
      throw new BadRequestException(
        `Model "${spec.model}" is not allowed. Allowed: ${[...ALLOWED_MODELS].join(', ')}`,
      );
    }
    if (!ALLOWED_ACTIONS.has(spec.action)) {
      throw new BadRequestException(
        `Action "${spec.action}" is not allowed. Allowed: ${[...ALLOWED_ACTIONS].join(', ')}`,
      );
    }
  }

  private sanitizeParams(
    spec: PrismaQuerySpec,
  ): Record<string, unknown> {
    const { params } = spec;
    const sanitized: Record<string, unknown> = {};

    if (params.where && Object.keys(params.where).length > 0) {
      sanitized.where = params.where;
    }

    if (spec.action === 'findMany') {
      if (params.select && Object.keys(params.select).length > 0) {
        sanitized.select = params.select;
      }
      if (params.orderBy && Object.keys(params.orderBy).length > 0) {
        sanitized.orderBy = params.orderBy;
      }
      sanitized.take = Math.min(params.take ?? DEFAULT_TAKE, MAX_TAKE);
    }

    return sanitized;
  }

  private applyPostFilter(records: any[], filter: PostFilter): any[] {
    return records.filter((record) => {
      const results = filter.conditions.map((c) =>
        this.compareFields(record[c.field], record[c.refField], c.op),
      );

      return filter.logic === 'OR'
        ? results.some(Boolean)
        : results.every(Boolean);
    });
  }

  private compareFields(
    a: unknown,
    b: unknown,
    op: string,
  ): boolean {
    const numA = Number(a);
    const numB = Number(b);
    if (isNaN(numA) || isNaN(numB)) return false;

    switch (op) {
      case 'lt':
        return numA < numB;
      case 'gt':
        return numA > numB;
      case 'lte':
        return numA <= numB;
      case 'gte':
        return numA >= numB;
      case 'eq':
        return numA === numB;
      case 'neq':
        return numA !== numB;
      default:
        return false;
    }
  }
}
