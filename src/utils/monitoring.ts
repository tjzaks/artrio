import { supabase } from '@/integrations/supabase/client';

// Monitoring and logging utilities
export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (import.meta.env.DEV) {
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(`[${level.toUpperCase()}] ${message}`, data);
    }

    // Send critical errors to backend
    if (level === 'error' && import.meta.env.PROD) {
      this.sendToBackend(entry);
    }
  }

  private async sendToBackend(entry: LogEntry) {
    try {
      // Store error logs in Supabase
      await supabase.from('error_logs').insert({
        level: entry.level,
        message: entry.message,
        data: entry.data,
        url: entry.url,
        user_agent: entry.userAgent,
      });
    } catch (error) {
      // Silently fail to avoid infinite loop
      logger.error('Failed to send log to backend:', error);
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  url: string;
  userAgent: string;
}

// Health check utilities
export class HealthCheck {
  static async checkSupabase(): Promise<HealthStatus> {
    try {
      const startTime = performance.now();
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const responseTime = performance.now() - startTime;

      if (error) {
        return {
          service: 'supabase',
          status: 'unhealthy',
          message: error.message,
          responseTime,
        };
      }

      return {
        service: 'supabase',
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        service: 'supabase',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async checkAuth(): Promise<HealthStatus> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return {
        service: 'auth',
        status: session ? 'healthy' : 'unauthenticated',
      };
    } catch (error) {
      return {
        service: 'auth',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async checkAll(): Promise<HealthCheckResult> {
    const [supabase, auth] = await Promise.all([
      this.checkSupabase(),
      this.checkAuth(),
    ]);

    const allHealthy = [supabase, auth].every(s => s.status === 'healthy' || s.status === 'unauthenticated');

    return {
      timestamp: new Date().toISOString(),
      status: allHealthy ? 'healthy' : 'unhealthy',
      services: {
        supabase,
        auth,
      },
    };
  }
}

interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unauthenticated';
  message?: string;
  responseTime?: number;
}

interface HealthCheckResult {
  timestamp: string;
  status: 'healthy' | 'unhealthy';
  services: {
    supabase: HealthStatus;
    auth: HealthStatus;
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private static marks: Map<string, number> = new Map();

  static startMeasure(name: string) {
    this.marks.set(name, performance.now());
  }

  static endMeasure(name: string): number | null {
    const startTime = this.marks.get(name);
    if (!startTime) return null;

    const duration = performance.now() - startTime;
    this.marks.delete(name);

    // Log slow operations
    if (duration > 1000) {
      Logger.getInstance().warn(`Slow operation: ${name}`, { duration });
    }

    return duration;
  }

  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name);
    try {
      const result = await fn();
      const duration = this.endMeasure(name);
      if (duration && duration > 1000) {
        Logger.getInstance().warn(`Slow async operation: ${name}`, { duration });
      }
      return result;
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }
}

// Export singleton logger instance
export const logger = Logger.getInstance();