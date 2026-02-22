import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface PostFilterCondition {
  field: string;
  op: 'lt' | 'gt' | 'lte' | 'gte' | 'eq' | 'neq';
  refField: string;
}

export interface PostFilter {
  logic: 'AND' | 'OR';
  conditions: PostFilterCondition[];
}

export interface PrismaQuerySpec {
  model: string;
  action: 'findMany' | 'count';
  params: {
    where?: Record<string, unknown>;
    select?: Record<string, boolean>;
    orderBy?: Record<string, string>;
    take?: number;
  };
  postFilter?: PostFilter;
}

const SCHEMA_DESCRIPTION = `Allowed Prisma models and their queryable fields:

vehicle: vehicle_id (String, unique), name (String), type (String: "truck"), latitude (Float), longitude (Float), current_temp (Float), min_temp (Float), max_temp (Float), status (String: "active"|"inactive"|"maintenance"), last_update (DateTime), created_at (DateTime)

trip: trip_code (String, unique), vehicle_id (String), vehicle_name (String), origin (String), destination (String), planned_start (DateTime), planned_end (DateTime), actual_start (DateTime?), actual_end (DateTime?), cargo_type (String), status (String: "planned"|"active"|"completed"|"failed"), is_compliant (Boolean), violation_count (Int), min_temp_recorded (Float?), max_temp_recorded (Float?), avg_temp_recorded (Float?), notes (String?), created_at (DateTime)

alert: vehicle_id (String), vehicle_name (String), alert_type (String), severity (String: "critical"|"warning"|"info"), message (String), temperature (Float?), is_resolved (Boolean), resolved_at (DateTime?), created_at (DateTime)

sensorReading: vehicle_id (String), temperature (Float), humidity (Float), latitude (Float), longitude (Float), timestamp (DateTime)

complianceResult: trip_id (String), trip_code (String), vehicle_name (String), origin (String), destination (String), standard_id (String), standard_name (String), status (String: "passed"|"failed"), score (Float), total_readings (Int), compliant_readings (Int), violation_count (Int), evaluated_at (DateTime)

vehicleRiskSnapshot: vehicle_id (String), score (Float), level (String: "LOW"|"MEDIUM"|"HIGH"), reasons (String[]), calculated_at (DateTime)

tripRiskSnapshot: trip_id (String), score (Float), level (String: "LOW"|"MEDIUM"|"HIGH"), predicted_eta (DateTime), expected_delay_minutes (Int), calculated_at (DateTime)

report: name (String), vehicle_ids (String[]), start_date (String), end_date (String), report_type (String), status (String), created_at (DateTime)`;

@Injectable()
export class QueryGeneratorService {
  private readonly logger = new Logger(QueryGeneratorService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateQuery(question: string): Promise<PrismaQuerySpec> {
    const systemPrompt = `You are a Prisma query generator for CryoCommand, a cold-chain logistics platform.
Convert the user's natural language question into a Prisma-compatible JSON query object.

Rules:
1. Output ONLY valid JSON. No explanation, no markdown fences, no extra text.
2. JSON format:
{
  "model": "<model name>",
  "action": "findMany" | "count",
  "params": {
    "where": { ... Prisma where filters ... },
    "select": { ... fields to return as true ... },
    "orderBy": { "<field>": "asc" | "desc" },
    "take": <number, max 50, default 20>
  },
  "postFilter": {
    "logic": "AND" | "OR",
    "conditions": [
      { "field": "<fieldA>", "op": "lt|gt|lte|gte|eq|neq", "refField": "<fieldB>" }
    ]
  }
}
3. Use "postFilter" ONLY when you need to compare two fields within the same record (e.g. current_temp vs min_temp). In that case, do NOT put that comparison in "where"; instead include both fields in "select" and leave "where" for other applicable filters only.
4. For standard value-based filters use Prisma operators in "where": equals, not, in, notIn, lt, lte, gt, gte, contains, startsWith, endsWith.
5. Date values must be ISO 8601 strings.
6. Always include meaningful "select" fields relevant to the user's question.
7. Never generate raw SQL, $runCommandRaw, $queryRaw, eval, or any executable code. Only Prisma JSON.
8. If the question is ambiguous, make a reasonable assumption.
9. For "count" action, only "where" is used in params (no select/orderBy/take).

${SCHEMA_DESCRIPTION}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        temperature: 1,
        max_completion_tokens: 2048,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';
      if (!raw) {
        this.logger.warn('LLM returned empty content for query generation');
        throw new Error('Query generation returned empty response');
      }

      this.logger.debug(`Raw LLM output: ${raw}`);
      return this.parseQuerySpec(raw);
    } catch (error: any) {
      this.logger.error(`Query generation failed: ${error.message}`);
      throw error;
    }
  }

  private parseQuerySpec(raw: string): PrismaQuerySpec {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/gm, '')
      .replace(/```$/gm, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!parsed.model || !parsed.action || !parsed.params) {
      throw new Error(
        `Invalid query spec: missing required fields (model, action, params). Got: ${Object.keys(parsed).join(', ')}`,
      );
    }

    return parsed as PrismaQuerySpec;
  }
}
