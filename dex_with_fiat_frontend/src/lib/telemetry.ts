function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags?: Record<string, unknown>;
  logs?: Array<{
    timestamp: number;
    level: string;
    message: string;
    fields?: Record<string, unknown>;
  }>;
}

class TelemetryService {
  private activeSpans = new Map<string, TraceSpan>();

  generateTraceId(): string {
    return generateId();
  }

  generateSpanId(): string {
    return generateId();
  }

  createSpan(
    operationName: string,
    parentSpanId?: string,
    traceId?: string,
  ): TraceSpan {
    const span: TraceSpan = {
      traceId: traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags: {},
      logs: [],
    };

    this.activeSpans.set(span.spanId, span);
    return span;
  }

  finishSpan(spanId: string, tags?: Record<string, unknown>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      if (tags) {
        span.tags = { ...span.tags, ...tags };
      }
      this.logSpanCompletion(span);
      this.activeSpans.delete(spanId);
    }
  }

  addLog(
    spanId: string,
    level: string,
    message: string,
    fields?: Record<string, unknown>,
  ): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      const logEntry = {
        timestamp: Date.now(),
        level,
        message,
        fields,
      };
      span.logs = span.logs || [];
      span.logs.push(logEntry);

      this.logWithTrace(level, message, span.traceId, span.spanId, fields);
    }
  }

  private logSpanCompletion(span: TraceSpan): void {
    const duration = span.endTime! - span.startTime;
    this.logWithTrace(
      'info',
      `Span completed: ${span.operationName} (${duration}ms)`,
      span.traceId,
      span.spanId,
      {
        duration,
        operationName: span.operationName,
        logCount: span.logs?.length || 0,
      },
    );
  }

  logWithTrace(
    level: string,
    message: string,
    traceId: string,
    spanId: string,
    fields?: Record<string, unknown>,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId,
      spanId,
      ...fields,
    };

    console.log(JSON.stringify(logData));
  }

  getTraceContext(traceId: string, spanId?: string): TraceContext {
    return {
      traceId,
      spanId: spanId || this.generateSpanId(),
    };
  }

  extractTraceFromHeaders(headers: Headers): TraceContext {
    const traceId = headers.get('x-trace-id') || this.generateTraceId();
    const spanId = headers.get('x-span-id') || this.generateSpanId();
    const parentSpanId = headers.get('x-parent-span-id') || undefined;

    return {
      traceId,
      spanId,
      parentSpanId,
    };
  }

  setTraceHeaders(headers: Headers, traceContext: TraceContext): void {
    headers.set('x-trace-id', traceContext.traceId);
    headers.set('x-span-id', traceContext.spanId);
    if (traceContext.parentSpanId) {
      headers.set('x-parent-span-id', traceContext.parentSpanId);
    }
  }
}

export const telemetry = new TelemetryService();

export function withTracing<T extends readonly unknown[], R>(
  operationName: string,
  fn: (...args: T) => Promise<R>,
  traceContext?: TraceContext,
) {
  return async (...args: T): Promise<R> => {
    const span = telemetry.createSpan(
      operationName,
      traceContext?.spanId,
      traceContext?.traceId,
    );

    try {
      telemetry.addLog(span.spanId, 'info', `Starting ${operationName}`, {
        operationName,
      });

      const result = await fn(...args);

      telemetry.finishSpan(span.spanId, { success: true });
      return result;
    } catch (error) {
      telemetry.addLog(span.spanId, 'error', `Error in ${operationName}`, {
        operationName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      telemetry.finishSpan(span.spanId, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };
}

export function logWithTrace(
  level: 'info' | 'warn' | 'error',
  message: string,
  traceContext: TraceContext,
  fields?: Record<string, unknown>,
): void {
  telemetry.logWithTrace(
    level,
    message,
    traceContext.traceId,
    traceContext.spanId,
    fields,
  );
}
