import { RealtimeClientService } from './realtimeClient';
import { logger } from '../shared/logger';
import { Errors, logAndCreateError } from '../shared/errors';
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
  serverSocket: WebSocket,
  backendClientService: BackendClientService,
  realtimeClientService: RealtimeClientService
): void {
  // OpenAI에서 Client로 relay 전송 
  realtimeClientService.onServerEvent((event: { type: string }) => {
    serverSocket.send(JSON.stringify(event));
  });

  // OpenAI에서 Client로 대화 아이템 업데이트 전송
  realtimeClientService.onCloseEvent((metadata: { error: boolean }) => {
    serverSocket.close();
  });

  // 대화 아이템이 업데이트 될 때마다 실행 
  realtimeClientService.onConversationItemUpdated(async (sessionItems: SessionItem[]) => {
    try {
      // 현재 세션 아이템 업데이트, 만약 변경된게 있다면 백엔드에 저장
      backendClientService.updateCurrentSessionItems(sessionItems);
    } catch (error) {
      // 내역 저장 실패 시 연결 중지 
      serverSocket.close();
      realtimeClientService.disconnect();
    }
  });
}

function setupClientToServerRelays(
  serverSocket: WebSocket,
  realtimeService: RealtimeClientService
): void {

  // Client 에서 OpenAI로 메시지 전송
  serverSocket.addEventListener("message", (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : event.data.toString();
    realtimeService.sendMessage(data);
  });

  // 연결 종료 이벤트 처리
  serverSocket.addEventListener("close", ({ code, reason }) => {
    realtimeService.disconnect();
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
  
  try {
    // OpenAI와 Client 간의 이벤트 중계 설정
    setupServerToClientRelays(serverSocket, backendClientService, realtimeClientService);

    // Client에서 OpenAI로 이벤트 중계 설정
    setupClientToServerRelays(serverSocket, realtimeClientService);
    
    // OpenAI RealtimeClient 연결
    await realtimeClientService.connect();

    return new Response(null, {
      status: 101,
      headers: responseHeaders,
      webSocket: clientSocket,
    });
  } catch (error) {
    logger.error("웹소켓 처리 에러", error);
    serverSocket.close();
    return logAndCreateError(Errors.CONNECTION_FAILED);
  }
}