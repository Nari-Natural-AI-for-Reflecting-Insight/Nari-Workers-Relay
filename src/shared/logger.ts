import { CONFIG } from '../config/constants';

class Logger {
  private prefix = "[owr]";
  private errorPrefix = "[owr error]";

  log(...args: unknown[]): void {
    if (CONFIG.DEBUG) {
      console.log(this.prefix, ...args);
    }
  }

  error(...args: unknown[]): void {
    console.error(this.errorPrefix, ...args);
  }

  info(...args: unknown[]): void {
    console.info(this.prefix, ...args);
  }
}

export const logger = new Logger();