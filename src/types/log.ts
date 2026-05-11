export type Level = "INFO" | "WARN" | "ERROR" | "DEBUG";

export type LogLine = {
  readonly id: string;
  readonly timestamp: number;
  readonly instance: string;
  readonly level: Level;
  readonly message: string;
};
