import { handleWebSocketUpgrade } from './services/websocketHandler';
import type { Env } from './types';
import { createErrorResponse, Errors } from './utils/errors';
import { validateWebSocketRequest } from './utils/requestValidator';

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

    return handleWebSocketUpgrade(request, env, ctx, {
      parentTalkId: validationResult.data.parentTalkId,
      jwtToken: validationResult.data.jwtToken,
    });
  },
};