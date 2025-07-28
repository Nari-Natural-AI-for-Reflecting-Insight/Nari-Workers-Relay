import type { Env } from '../shared/types';
import { logger } from '../shared/logger';
import {
  ApiEnvelope,
  ApiError,
  ApiFailure,
  HttpMethod,
} from './types';

interface ApiOptions extends Omit<RequestInit, 'headers'> {
  jwtToken?: string;
  headers?: HeadersInit;
}

async function requestJson<T>(
  env: Env,
  method: HttpMethod,
  path: string,
  { jwtToken, ...init }: ApiOptions = {},
) {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (jwtToken) headers.set('Authorization', `Bearer ${jwtToken}`);

  const res = await fetch(`${env.API_BASE_URL}${path}`, {
    ...init,
    method,
    headers,
  });

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch (e) {
    logger.error('JSON parse error', { path, status: res.status });
    throw new ApiError('E_PARSE', '잘못된 JSON 응답입니다.', null, res.status);
  }

  return { res, parsed };
}

export async function apiRequest<T, E = unknown>(
  env: Env,
  method: HttpMethod,
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const { res, parsed } = await requestJson<ApiEnvelope<T, E>>(
    env,
    method,
    path,
    opts,
  );

  // 1) HTTP 자체 오류
  if (!res.ok) {
    const failResponse = parsed as ApiFailure<E>;

    await logger.error('HTTP error', { path, status: res.status, message: failResponse.error.message });
    throw new ApiError('E_HTTP', `HTTP ${res.status}`, null);
  }

  // 2) 비즈니스 오류
  const envelope = parsed as ApiEnvelope<T, E>;
  if (envelope.result === 'SUCCESS') {
    return envelope.data;
  }

  // result === 'ERROR'
  throw new ApiError(
    envelope.error.code,
    envelope.error.message,
    envelope.error.data,
    res.status,
  );
}