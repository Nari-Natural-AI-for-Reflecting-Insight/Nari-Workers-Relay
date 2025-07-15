export const CONFIG = {
  DEBUG: false,
  MODEL: "gpt-4o-mini-realtime-preview-2024-12-17",
  OPENAI_BASE_URL: "wss://api.openai.com/v1/realtime",
  WEBSOCKET_PROTOCOL: "realtime",
} as const;

export const getOpenAIUrl = () => `${CONFIG.OPENAI_BASE_URL}?model=${CONFIG.MODEL}`;
