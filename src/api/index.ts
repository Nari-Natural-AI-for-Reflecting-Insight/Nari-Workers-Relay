// api-client.ts --------------------------------------------------
import { apiRequest } from './request';
import type { Env } from '../shared/types';
import { CreateTalkSessionRequest, TalkSessionInfo } from './types';
import { HttpMethod } from './types';

export class ApiClient {
  constructor(private env: Env, private jwt?: string) {}

  private request<T>(method: HttpMethod, path: string, body?: unknown) {
    return apiRequest<T>(this.env, method, path, {
      jwtToken: this.jwt,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  createTalkSession(parentTalkId: string, idempotencyKey: string): Promise<TalkSessionInfo> {
    return this.request<TalkSessionInfo>('POST', '/talk/session', {
      parentTalkId,  
      idempotencyKey
    });
  }

  createSessionItem(request: CreateTalkSessionRequest): Promise<void> {
    return this.request<void>('POST', `/talk/session/${request.sessionId}/item`, request);
  }

}