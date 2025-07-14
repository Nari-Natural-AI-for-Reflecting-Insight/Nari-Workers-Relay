export interface Env {
  OPENAI_API_KEY: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface ConversationItem {
  id: string;
  type: string;
  content: any;
  [key: string]: any;
}
