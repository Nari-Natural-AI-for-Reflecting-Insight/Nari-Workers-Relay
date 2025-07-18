import { handleWebSocketUpgrade } from './services/websocketHandler';
import type { Env } from './shared/types';
import { createErrorResponse, Errors } from './shared/errors';
import { validateWebSocketRequest } from './shared/requestValidator';
import { BackendClientService } from './services/backendClient';
import { RealtimeClientService } from './services/realtimeClient';

const createServices = (env: Env, jwtToken: string) => ({
  backendClientService: new BackendClientService(env, jwtToken),
  realtimeClientService: new RealtimeClientService(env),
});

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    
    // 요청 유효성 검사
    const validationResult = validateWebSocketRequest(request);
    if (!validationResult.success || !validationResult.data) {
      return validationResult.error || createErrorResponse(Errors.INVALID_REQUEST);
    }

    const { jwtToken, parentTalkId } = validationResult.data;
    const { backendClientService, realtimeClientService } = createServices(env, jwtToken);

    try {
      // 백엔드에 Talk Session 생성 요청, 응답 받은 Talk Session 정보는 backendClientService 객체에 보관 
      await backendClientService.createTalkSession(parentTalkId);
    } catch (error) {
      return createErrorResponse(Errors.CONNECTION_FAILED);
    }

    return handleWebSocketUpgrade({
      backendClientService,
      realtimeClientService,
    });
  },
};