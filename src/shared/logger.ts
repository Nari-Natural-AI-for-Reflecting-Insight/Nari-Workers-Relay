import { logCatchError } from "./errors";
import { Env } from "./types";

export class Logger {
  private prefix = "[owr]";
  private errorPrefix = "[owr error]";
  private debug_mode: boolean;
  private lokiUrl: string;
  private jobName: string;
  private requestHeaders: Record<string, string>;
  private lastTimestamp: bigint = 0n;

  constructor(
    debug_mode: boolean = false,
    lokiUrl: string,
    job_name: string = 'owr-job'
  ) {
    this.debug_mode = debug_mode;
    this.lokiUrl = lokiUrl;
    this.jobName = job_name;
    this.requestHeaders = {
      'Content-Type': 'application/json',
      'X-Scope-OrgID': 'fake',
      'User-Agent': 'cloudflare-worker-logger'
    };
  }

  changeLoggerConfigByEnv(
    env: Env
  ): void {
    this.debug_mode = env.DEBUG_MODE;
    this.lokiUrl = env.LOKI_URL
    this.jobName = env.LOKI_JOB_NAME;

    this.requestHeaders = {
      'Content-Type': 'application/json',
      'X-Scope-OrgID': 'fake',
      'User-Agent': 'cloudflare-worker-logger'
    };
  }

  argsToString(args: unknown[]): string {
    return args.map(arg => {
      try {
        return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
      } catch (e: unknown) {
        logCatchError(e, '[argsToString] JSON 변환 실패');
        return '[json 변환 실패]';
      }
    }).join(' ');
  }

  /**
   * 현재 타임스탬프를 나노초 단위로 반환합니다.
   * 이전 타임스탬프와 같은 값이면 +1 나노초를 추가합니다. (도착한 순서 보장)
   * 
   * milli seconds: 1초 = 1,000 밀리초
   * micro seconds: 1초 = 1,000,000 마이크로초
   * nano seconds: 1초 = 1,000,000,000 나노초
   */
  getTimestamp(): string {

    // date.now()는 밀리초 단위로 현재 시간을 반환합니다.
    // 현재 시간을 나노초로 변환 
    const nowNs = BigInt(Date.now()) * 1_000_000n; 
    
    // 현재 타임스탬프가 이전 타임스탬프와 같거나 작으면 +1 나노초
    if (nowNs <= this.lastTimestamp) {
      this.lastTimestamp = this.lastTimestamp + 1n;
    } else {
      this.lastTimestamp = nowNs;
    }
    
    return this.lastTimestamp.toString();
  }

  createPayloadBy(message: string, level: string): Record<string, unknown> {
    const payloadTimestamp = this.getTimestamp();
    
    return {
      streams: [{
        stream: {
          job: this.jobName,
          level: level
        },
        values: [[
          payloadTimestamp,
          message
        ]]
      }]
    };
  }

  async sendToLoki(message: string, level = 'info') {
    const requestPayload = this.createPayloadBy(message, level);

    try {
      const response = await fetch(this.lokiUrl, {
        method: 'POST',
        headers: this.requestHeaders,
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${this.prefix} [메시지 전송 실패] ${message}`, `[error 응답] ${errorText}`);
      }
    } catch (error: unknown) {
      logCatchError(error, `${this.prefix} [메시지 전송 실패] ${message}`);
    }
  }

  async error(...args: unknown[]): Promise<void> {
    console.error(this.errorPrefix, ...args);
    const message = this.argsToString(args);
    
    await this.sendToLoki(`${this.errorPrefix} ${message}`, 'error');
  }

  async info(...args: unknown[]): Promise<void> {
    const message = this.argsToString(args);

    await this.sendToLoki(`${this.prefix} ${message}`, 'info');
  }

  async debug(...args: unknown[]): Promise<void> {
    if(!this.debug_mode) {
      return;
    }

    const message = this.argsToString(args);

    await this.sendToLoki(`${this.prefix} ${message}`, 'debug');
  }
}

export const logger = new Logger(
  false, 
  'https://loki.example.com/api/prom/push',
  'owr-job'
);
