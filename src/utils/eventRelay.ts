import { RealtimeClient } from "@openai/realtime-api-beta";
import { RealtimeClientService } from '../services/realtimeClient';
import { logger } from './logger';

export function setupEventRelays(
  realtimeClient: RealtimeClient,
  serverSocket: WebSocket,
  realtimeService: RealtimeClientService
): void {
  // OpenAI -> Client relay
  realtimeClient.realtime.on("server.*", (event: { type: string }) => {
    serverSocket.send(JSON.stringify(event));
  });

  realtimeClient.realtime.on("close", (metadata: { error: boolean }) => {
    logger.log(`서버에서 연결을 종료했습니다. 에러 여부: ${metadata.error}`);
    serverSocket.close();
  });

  // Conversation updates
  realtimeClient.on("conversation.updated", async ({ item, delta }: any) => {
    const items = realtimeClient.conversation.getItems();
    items.forEach((item: any) => {
      console.log("Item:", item);
    });
  });

  // Client -> OpenAI relay
  serverSocket.addEventListener("message", (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : event.data.toString();
    realtimeService.sendMessage(data);
  });

  serverSocket.addEventListener("close", ({ code, reason }) => {
    logger.log(`클라이언트가 연결을 종료했습니다. 코드: ${code}, 이유: ${reason}`);
    realtimeService.disconnect();
  });
}