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
} as const;

export type AppError = typeof Errors[keyof typeof Errors];

export function createErrorResponse(error: AppError): Response {
  return new Response(error.message, { status: error.status });
}

export function logAndCreateError(error: AppError, details?: unknown): Response {
  logger.error(error.message, details);
  return createErrorResponse(error);
}