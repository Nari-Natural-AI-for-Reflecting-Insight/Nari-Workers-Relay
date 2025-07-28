import { handleWebSocketUpgrade } from './services/websocketHandler';
import type { Env } from './shared/types';
import { createErrorResponse, Errors } from './shared/errors';
import { validateWebSocketRequest } from './shared/requestValidator';
import { createAppContext } from './shared/appContext';
import { logger } from './shared/logger';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {

    logger.changeLoggerConfigByEnv(env);
    logger.debug("---WebSocket 요청이 들어왔습니다.---");

    const {
      backendClientServiceFactory,
      realtimeClientService
    } = createAppContext(env);

    // 요청 유효성 검사
    const validationResult = await validateWebSocketRequest(request);
    if (!validationResult.success || !validationResult.data) {
      return validationResult.error || await createErrorResponse(Errors.INVALID_REQUEST);
    }

    logger.debug("유효성 검사 통과, 입력받은 데이터: ", validationResult.data);

    const { jwtToken, parentTalkId } = validationResult.data;
    const backendClientService = backendClientServiceFactory(jwtToken);

    try {
      // Talk Session 생성
      await backendClientService.createTalkSession(parentTalkId);
    } catch (error) {
      return await createErrorResponse(Errors.TALK_CREATE_SESSION_FAILED);
    }
      
    return handleWebSocketUpgrade({
      backendClientService,
      realtimeClientService,
    });
  },
};