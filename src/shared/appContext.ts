// shared/appContext.ts
import type { Env } from './types';
import { BackendClientService } from '../services/backendClient';
import { RealtimeClientService } from '../services/realtimeClient';
import { logger } from './logger';

export interface AppContext {
  backendClientServiceFactory: (jwtToken: string) => BackendClientService;
  realtimeClientService: RealtimeClientService;
}

export async function createAppContext(env: Env): Promise<AppContext> {
  const dailyPsychologyCheckInstructions = await env.NARI_KV.get("daily_psychology_check_instructions", "text") || '';
  logger.debug("심리상태 체크 지시문: ", dailyPsychologyCheckInstructions);

  return {
    backendClientServiceFactory: (jwtToken) => new BackendClientService(env, jwtToken),
    realtimeClientService: new RealtimeClientService(env, dailyPsychologyCheckInstructions),
  };
}
