import { RealtimeClientService } from './realtimeClient';
import { setupEventRelays } from '../utils/eventRelay';
import { logger } from '../utils/logger';
import type { Env } from '../types';
import { Errors, logAndCreateError } from '../utils/errors';

export async function handleWebSocketUpgrade(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const webSocketPair = new WebSocketPair();
  const [clientSocket, serverSocket] = Object.values(webSocketPair);

  serverSocket.accept();

  const responseHeaders = createResponseHeaders(request);
  const realtimeService = new RealtimeClientService(env);

  try {
    const realtimeClient = await realtimeService.createClient();
    
    // OpenAI와 Client 간의 이벤트 중계 설정
    setupEventRelays(realtimeClient, serverSocket, realtimeService);
    
    // OpenAI RealtimeClient 연결
    await realtimeService.connect();

    return new Response(null, {
      status: 101,
      headers: responseHeaders,
      webSocket: clientSocket,
    });
  } catch (error) {
    logger.error("Error in WebSocket upgrade", error);
    serverSocket.close();
    return logAndCreateError(Errors.CONNECTION_FAILED);
  }
}

function createResponseHeaders(request: Request): Headers {
  const headers = new Headers();
  const protocolHeader = request.headers.get("Sec-WebSocket-Protocol");
  
  if (protocolHeader) {
    const requestedProtocols = protocolHeader.split(",").map((p) => p.trim());
    if (requestedProtocols.includes("realtime")) {
      headers.set("Sec-WebSocket-Protocol", "realtime");
    }
  }
  
  return headers;
}
