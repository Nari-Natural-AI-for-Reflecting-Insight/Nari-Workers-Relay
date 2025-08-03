import { RealtimeClientService } from './realtimeClient';
import { logger } from '../shared/logger';
import { createErrorResponse, Errors, logAndCreateError, logCatchError } from '../shared/errors';
import { SessionItem } from './types';
import { BackendClientService } from './backendClient';

type HandleWebSocketUpgradeParams = {
  backendClientService: BackendClientService;
  realtimeClientService: RealtimeClientService;
};

function createResponseHeaders(): Headers {
  const headers = new Headers();
  headers.set("Sec-WebSocket-Protocol", "realtime");
  
  return headers;
}

function setupServerToClientRelays(
  clientSocket: WebSocket,
  serverSocket: WebSocket,
  backendClientService: BackendClientService,
  realtimeClientService: RealtimeClientService
): void {
  // OpenAI에서 Client로 relay 전송 
  realtimeClientService.onServerEvent((event: { type: string }) => {
    serverSocket.send(JSON.stringify(event));
  });

  // 대화 아이템이 업데이트 될 때마다 실행 
  realtimeClientService.onConversationItemUpdated(async (sessionItems: SessionItem[]) => {
      // 현재 세션 아이템 업데이트, 만약 변경된게 있다면 백엔드에 저장
      backendClientService.updateCurrentSessionItems(sessionItems)
        .catch((error: unknown) => {
          logCatchError(error, "대화 아이템 업데이트 중 오류 발생");
          clientSocket.dispatchEvent(new ErrorEvent("error", {
            message: Errors.TALK_CANCELED.message,
            error: new Error(Errors.TALK_CANCELED.message)
          }));

          backendClientService.cancelTalk();
          realtimeClientService.disconnect();
          clientSocket.close();
          serverSocket.close();
        });
  });
}

function setupClientToServerRelays(
  clientSocket: WebSocket,
  serverSocket: WebSocket,
  backendClientService: BackendClientService,
  realtimeService: RealtimeClientService
): void {

  // Client 에서 OpenAI로 메시지 전송
  serverSocket.addEventListener("message", (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : event.data.toString();
    realtimeService.sendMessage(data);
  });

  // 연결 종료 이벤트 처리
  serverSocket.addEventListener("close", ({ code, reason }) => {
    backendClientService.cancelTalk(); // 대화 상태 취소로 저장
    logger.debug("웹소켓 연결 종료", { code, reason });
    realtimeService.disconnect();

    clientSocket.close(code, reason);
  });
}

export async function handleWebSocketUpgrade(
  { 
    backendClientService,
    realtimeClientService
   }: HandleWebSocketUpgradeParams
): Promise<Response> {
  const webSocketPair = new WebSocketPair();
  const [clientSocket, serverSocket] = Object.values(webSocketPair);

  serverSocket.accept();
  const responseHeaders = createResponseHeaders();

  realtimeClientService.onCloseEvent(async (metadata: { error: boolean }) => {
    clientSocket.close(1000, "OpenAI RealtimeClient 연결 종료");
    await logger.debug("WebSocket 연결 종료 이벤트 발생", metadata);
  });
  
  try {

    // OpenAI와 Client 간의 이벤트 중계 설정
    setupServerToClientRelays(clientSocket, serverSocket, backendClientService, realtimeClientService);

    // Client에서 OpenAI로 이벤트 중계 설정
    setupClientToServerRelays(clientSocket, serverSocket, backendClientService, realtimeClientService);
    
    logger.debug("openai websocket 연결 시도 중...");

    // OpenAI RealtimeClient 연결
    await realtimeClientService.connect();

    logger.debug("openai websocket 연결 성공");

    return new Response(null, {
      status: 101,
      headers: responseHeaders,
      webSocket: clientSocket,
    });
  } catch (error: unknown) {
    clientSocket.close();
    serverSocket.close();
    backendClientService.cancelTalk(); // 대화 상태 취소로 저장 
    logCatchError(error, "WebSocket 연결 중 오류 발생");
    return await createErrorResponse(Errors.CONNECTION_FAILED);
  }
}