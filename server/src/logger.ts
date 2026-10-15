export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, string | number | boolean | undefined>;

export interface LogEntry extends LogFields {
  timestamp: string;
  level: LogLevel;
  event: string;
}

export interface Logger {
  log(level: LogLevel, event: string, fields?: LogFields): void;
}

const LEVEL_ORDER: Record<LogLevel | "silent", number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export function createLogger(
  env: { LOG_LEVEL?: string } = process.env,
  write: (line: string) => void = (line) => {
    process.stdout.write(line);
  },
): Logger {
  const configured = env.LOG_LEVEL;
  const threshold =
    configured && configured in LEVEL_ORDER
      ? LEVEL_ORDER[configured as LogLevel | "silent"]
      : LEVEL_ORDER.info;

  return {
    log(level, event, fields = {}) {
      if (LEVEL_ORDER[level] < threshold) return;
      const entry: LogEntry = {
        ...fields,
        timestamp: new Date().toISOString(),
        level,
        event,
      };
      write(`${JSON.stringify(entry)}\n`);
    },
  };
}
