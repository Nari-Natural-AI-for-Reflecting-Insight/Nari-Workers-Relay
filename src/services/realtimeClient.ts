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

  constructor(
    private env: Env,
    private dailyPsychologyCheckInstructions: string
  ) {
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
    
    // 연결 후 지시문과 설정 업데이트
    await this.updateSessionWithInstructions();
    
    this.processMessageQueue();
  }

  /**
   * 세션에 지시문과 설정을 업데이트
   */
  private async updateSessionWithInstructions(): Promise<void> {
    try {
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: this.dailyPsychologyCheckInstructions,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 200
          },
          tools: [],
          tool_choice: 'auto',
          temperature: 0.7,
          max_response_output_tokens: 4096
        }
      };

      this.client.realtime.send('session.update', sessionUpdate);
      logger.info('세션에 심리상태 체크 지시문을 업데이트했습니다.');
    } catch (error) {
      logCatchError(error, "세션 업데이트 중 오류 발생");
      throw new Error("세션 설정을 업데이트하는 데 실패했습니다.");
    }
  }

  /**
   * 사용자 정의 지시문으로 세션 업데이트
   */
  async updateInstructions(customInstructions: string): Promise<void> {
    try {
      const sessionUpdate = {
        type: 'session.update',
        session: {
          instructions: customInstructions
        }
      };

      this.client.realtime.send('session.update', sessionUpdate);
      logger.info('사용자 정의 지시문으로 세션을 업데이트했습니다.');
    } catch (error) {
      logCatchError(error, "지시문 업데이트 중 오류 발생");
      throw new Error("지시문을 업데이트하는 데 실패했습니다.");
    }
  }

  /**
   * 대화 시작 - 첫 번째 질문을 자동으로 시작
   */
  async startPsychologyCheck(): Promise<void> {
    if (!this.client.isConnected()) {
      throw new Error("클라이언트가 연결되지 않았습니다.");
    }

    try {
      const startMessage = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: '일일 심리상태 체크를 시작해주세요.'
          }]
        }
      };

      this.client.realtime.send('conversation.item.create', startMessage);
      
      // AI가 응답하도록 요청
      const responseCreate = {
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: '첫 번째 질문(전반적 기분 상태)부터 시작해주세요.'
        }
      };
      
      this.client.realtime.send('response.create', responseCreate);
      
      logger.info('심리상태 체크를 시작했습니다.');
    } catch (error) {
      logCatchError(error, "심리상태 체크 시작 중 오류 발생");
      throw new Error("심리상태 체크를 시작하는 데 실패했습니다.");
    }
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

  /**
   * 텍스트 메시지 전송 (간편 메소드)
   */
  sendTextMessage(text: string): void {
    if (!this.client.isConnected()) {
      logger.warn("클라이언트가 연결되지 않았습니다. 메시지를 큐에 추가합니다.");
      return;
    }

    try {
      const messageEvent = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: text
          }]
        }
      };

      this.client.realtime.send('conversation.item.create', messageEvent);
      
      // AI 응답 요청
      this.client.realtime.send('response.create', {
        type: 'response.create'
      });
    } catch (error) {
      logCatchError(error, "텍스트 메시지 전송 중 오류 발생");
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

  onResponseCompleted(
    callback: (response: any) => void
  ): void {
    this.client.on("response.done", (event: any) => {
      callback(event);
    });
  }

  onTranscriptionCompleted(
    callback: (transcription: string) => void
  ): void {
    this.client.on("conversation.item.input_audio_transcription.completed", (event: any) => {
      callback(event.transcript);
    });
  }
}