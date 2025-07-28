import { apiRequest } from './request';
import type { Env } from '../shared/types';
import { CreateTalkSessionRequest, TalkSessionInfo } from './types';
import { HttpMethod } from './types';
import { logger } from '../shared/logger';

export class ApiClient {
  constructor(private env: Env, private jwt?: string) {}

  private async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {

    logger.debug(`API 요청: ${method} ${path}`, body);

    return await apiRequest<T>(this.env, method, path, {
      jwtToken: this.jwt,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async createTalkSession(parentTalkId: string, idempotencyKey: string): Promise<TalkSessionInfo> {
    return await this.request<TalkSessionInfo>('POST', '/talk/session', {
      parentTalkId,  
      idempotencyKey
    });
  }

  async createSessionItem(request: CreateTalkSessionRequest): Promise<void> {
    return await this.request<void>('POST', `/talk/session/${request.sessionId}/item`, request);
  }

}