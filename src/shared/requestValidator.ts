import { createErrorResponse, Errors } from './errors';
import { logger } from './logger';

export interface ValidationResult {
  success: boolean;
  data?: {
    parentTalkId: string;
    jwtToken: string;
  };
  error?: Response;
}

export async function validateWebSocketRequest(request: Request): Promise<ValidationResult> {

	// WebSocket 업그레이드 요청인지 확인
  const upgradeHeader = request.headers.get("Upgrade");
  logger.debug("request -> Upgrade header:", upgradeHeader);

  if (upgradeHeader !== "websocket") {
    return {
      success: false,
      error: await createErrorResponse(Errors.INVALID_REQUEST)
    };  
  }

  // URL에서 talkId 파라미터 추출
  const url = new URL(request.url);
  const parentTalkId = url.searchParams.get('parentTalkId');
  logger.debug("request -> parentTalkId:", parentTalkId);

  if (!parentTalkId) {
    return {
      success: false,
      error: await createErrorResponse(Errors.INVALID_REQUEST)
    };
  }

  // 헤더에서 JWT 토큰 추출
  const jwtToken = extractJwtToken(request);
  logger.debug("request -> JWT Token:", jwtToken);

  if (!jwtToken) {
    return {
      success: false,
      error: await createErrorResponse(Errors.UNAUTHORIZED)
    };
  }

  return {
    success: true,
    data: {
      parentTalkId,
      jwtToken
    }
  };
}

// 추가적인 검증 함수들
export function extractTalkId(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('talkId');
}

export function validateTalkId(talkId: string | null): boolean {
  return talkId !== null && talkId.trim().length > 0;
}

export function validateJwtToken(jwtToken: string | null): boolean {
  return jwtToken !== null && jwtToken.trim().length > 0;
}

export function extractJwtToken(request: Request): string | null {
  const protoHeader = request.headers.get('Sec-WebSocket-Protocol');
  if (!protoHeader) return null;

  const bearerEntry = protoHeader
    .split(',')
    .map(p => p.trim())
    .find(p => p.startsWith('bearer.'));

  return bearerEntry ? bearerEntry.slice('bearer.'.length) : null;
}