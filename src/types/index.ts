export type Env = {
  OPENAI_API_KEY: string;
  API_BASE_URL: string;
}

export type WebSocketMessage = {
  type: string;
  [key: string]: unknown;
}

export type TalkUpdatedEvent =  {
  item: {
    id: string;
  };
  delta: ItemContentDelta | null;
}

export type ItemContentDelta = {
  text?: string;
  audio?: Int16Array;
  arguments?: string;
  transcript?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiSuccess<T> {
  result: 'SUCCESS';
  data: T;
  error: null;
}

export interface ApiFailure<E = unknown> {
  result: 'ERROR';
  data: null;
  error: {
    code: string;
    message: string;
    data: E | null;
  };
}

export type ApiEnvelope<T, E = unknown> = ApiSuccess<T> | ApiFailure<E>;

export class ApiError<E = unknown> extends Error {
  constructor(
    public code: string,
    message: string,
    public data: E | null = null,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type TalkSessionStatus =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type TalkSessionInfo = {
  talkSessionId: number; // 새로 만들어진 TalkSession의 PK
  parentTalkId: number; // 부모 Talk(PK)
  createdUserId: number; // 세션을 만든 사용자 PK
  status: TalkSessionStatus; // 세션 상태
  createdAt: string; // 생성 시각
  completedAt: string | null; // 완료 시각, 없으면 null
};

export type CreateTalkSessionResponse = ApiSuccess<TalkSessionInfo>;
