// api-client.ts --------------------------------------------------
import { apiRequest } from './request';
import { CreateTalkSessionResponse, Env, TalkSessionInfo } from '../types';
import { HttpMethod } from '../types';

export class ApiClient {
  constructor(private env: Env, private jwt?: string) {}

  private request<T>(method: HttpMethod, path: string, body?: unknown) {
    return apiRequest<T>(this.env, method, path, {
      jwtToken: this.jwt,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  getTalk(parentTalkId: string, idempotencyKey: string): Promise<TalkSessionInfo> {
    return this.request<TalkSessionInfo>('POST', '/talk/session', {
      parentTalkId,  
      idempotencyKey
    });
  }

}