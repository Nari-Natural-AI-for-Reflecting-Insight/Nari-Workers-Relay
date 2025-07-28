// shared/appContext.ts
import type { Env } from './types';
import { BackendClientService } from '../services/backendClient';
import { RealtimeClientService } from '../services/realtimeClient';

export interface AppContext {
  backendClientServiceFactory: (jwtToken: string) => BackendClientService;
  realtimeClientService: RealtimeClientService;
}

export function createAppContext(env: Env): AppContext {
  return {
    backendClientServiceFactory: (jwtToken) => new BackendClientService(env, jwtToken),
    realtimeClientService: new RealtimeClientService(env),
  };
}
