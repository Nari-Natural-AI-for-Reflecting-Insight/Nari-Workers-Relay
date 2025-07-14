import { RealtimeClient } from "@openai/realtime-api-beta";
import { getOpenAIUrl, CONFIG } from '../config/constants';
import { logger } from '../utils/logger';
import { validateEnv } from '../utils/validation';
import type { Env } from '../types';

export class RealtimeClientService {
  private client: RealtimeClient | null = null;
  private messageQueue: string[] = [];

  constructor(private env: Env) {}

  async createClient(): Promise<RealtimeClient> {
    // 환경 변수 검증
    const validation = validateEnv(this.env);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      this.client = new RealtimeClient({
        apiKey: this.env.OPENAI_API_KEY,
        debug: CONFIG.DEBUG,
        url: getOpenAIUrl(),
      });
      return this.client;
    } catch (error) {
      logger.error("OpenAI RealtimeClient 생성 오류", error);

      throw new Error("OpenAI RealtimeClient를 생성하는 데 실패했습니다.");
    }
  }

  async connect(): Promise<void> {
    if (!this.client) {
      throw new Error("클라이언트가 생성되지 않았습니다. 먼저 createClient()를 호출하세요.");
    }

    await this.client.connect();
    
    // Process queued messages
    this.processMessageQueue();
  }

  queueMessage(message: string): void {
    this.messageQueue.push(message);
  }

  /**
   * 연결되기 전까지 저장한 메시지를 전송
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length && this.client?.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  sendMessage(data: string): void {
    if (!this.client?.isConnected()) {
      this.queueMessage(data);
      return;
    }

    try {
      const parsedEvent = JSON.parse(data);
      this.client.realtime.send(parsedEvent.type, parsedEvent);
    } catch (error) {
      logger.error("클라이언트 메시지 전송 오류", error);
    }
  }

  disconnect(): void {
    this.client?.disconnect();
    this.messageQueue.length = 0;
  }

  getClient(): RealtimeClient | null {
    return this.client;
  }
}