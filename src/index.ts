import { handleWebSocketUpgrade } from './services/websocketHandler';
import type { Env } from './types';
import { createErrorResponse, Errors } from './utils/errors';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return createErrorResponse(Errors.INVALID_REQUEST);
    }

    return handleWebSocketUpgrade(request, env, ctx);
  },
};