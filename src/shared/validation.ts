import { logger } from './logger';
import type { Env } from '../shared/types';

export function validateEnv(env: Env): {
  valid: boolean;
  error?: string;
} {
  if (!env.OPENAI_API_KEY) {
    const errorMessage = "api 키가 없네요? 정신차리세요!";
    logger.error(errorMessage);
    return {
      valid: false,
      error: errorMessage
    };
  }

  return { valid: true };
}
