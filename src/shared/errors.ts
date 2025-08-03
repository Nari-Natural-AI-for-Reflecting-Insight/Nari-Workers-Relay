import { logger } from './logger';

export const Errors = {
  CONNECTION_FAILED: {
    message: 'Failed to connect to OpenAI',
    status: 500
  },
  INVALID_REQUEST: {
    message: 'Invalid WebSocket request',
    status: 400
  },
  INTERNAL_ERROR: {
    message: 'Internal server error',
    status: 500
  },
  UNAUTHORIZED: {
    message: '로그인 정보가 없습니다. 로그인 후 다시 시도해주세요.',
    status: 401
  },
  TALK_CREATE_SESSION_FAILED: {
    message: 'Talk Session 생성에 실패했습니다.',
    status: 400
  },
  TALK_CANCELED: {
    message: '현재 대화가 취소된 상태입니다.',
    status: 400
  },
} as const;

export type AppError = typeof Errors[keyof typeof Errors];

export async function createErrorResponse(error: AppError): Promise<Response> {
  await logger.error(error.message);
  return new Response(error.message, { status: error.status });
}

export async function logAndCreateError(error: AppError, details?: unknown): Promise<Response> {
  logger.error(error.message, details);
  return await createErrorResponse(error);
}

export async function logCatchError(
  error: unknown,
  message: string = '예상치 못한 에러 발생'
): Promise<Response> {
  if (error instanceof Error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  } else {
    logger.error(`${message}: ${String(error)}`);
  }
  return await createErrorResponse(Errors.INTERNAL_ERROR);
}