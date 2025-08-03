import { RealtimeClient } from "@openai/realtime-api-beta";
import { getOpenAIUrl, CONFIG } from '../config/constants';
import { logger } from '../shared/logger';
import { validateEnv } from '../shared/validation';
import type { Env } from '../shared/types';
import { ContentType, SessionItem, SessionItemRole } from "./types";
import { logCatchError } from "../shared/errors";

export class RealtimeClientService {
  private client: RealtimeClient;
  private messageQueue: string[] = [];

  constructor(private env: Env) {
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
    } catch (error) {
      logCatchError(error, "OpenAI RealtimeClient 생성 중 오류 발생");
      throw new Error("OpenAI RealtimeClient를 생성하는 데 실패했습니다.");
    }
  }

  async connect(): Promise<void> {
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
    while (this.messageQueue.length && this.client.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  sendMessage(data: string): void {
    if (!this.client.isConnected()) {
      this.queueMessage(data);
      return;
    }

    try {
      const parsedEvent = JSON.parse(data);
      this.client.realtime.send(parsedEvent.type, parsedEvent);
    } catch (error: unknown) {
      logCatchError(error, "메시지 전송 중 오류 발생");
    }
  }

  disconnect(): void {
    this.client?.disconnect();
    this.messageQueue.length = 0;
  }

  getClient(): RealtimeClient | null {
    return this.client;
  }

  onServerEvent(
    callback: (event: { type: string}) => void
  ): void {
    this.client.realtime.on("server.*", (event: { type: string }) => {
      callback(event);
    });
  }

  onCloseEvent(
    callback: (metadata: { error: boolean }) => void
  ): void {
    this.client.realtime.on("close", (metadata: { error: boolean }) => {
      callback(metadata);
    });
  }

  onConversationItemUpdated(
    callback: (sessionItems: SessionItem[]) => void
  ): void {
      this.client.on("conversation.item.completed", (event: unknown) => {
        const sessionItems = this.client.conversation.getItems().map((item) => ({
          id: item.id,
          role: item.role as SessionItemRole,
          status: 'completed' as const,
          contentText: item.formatted?.text || item.formatted?.transcript || '',
          contentType: item.type as ContentType
        }));

        callback(sessionItems);
    });
  }
}