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
  }
} as const;

export type AppError = typeof Errors[keyof typeof Errors];

export function createErrorResponse(error: AppError): Response {
  return new Response(error.message, { status: error.status });
}

export function logAndCreateError(error: AppError, details?: unknown): Response {
  logger.error(error.message, details);
  return createErrorResponse(error);
}