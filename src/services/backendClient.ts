import type { Env } from '../shared/types';
import { ApiClient } from "../api";
import { TalkSessionInfo } from "../api/types";
import { SessionItem } from "./types";

export class BackendClientService {
  private apiClient: ApiClient;
  private talkSessionInfo: TalkSessionInfo | undefined;
  private sessionItemMap: Map<string, SessionItem>;

  constructor( env: Env, jwt: string){
  	this.apiClient = new ApiClient(env, jwt);
    this.sessionItemMap = new Map();
  }

  async createTalkSession(parentTalkId: string): Promise<TalkSessionInfo> {

		const talkSessionInfo = await this.apiClient.createTalkSession(parentTalkId, crypto.randomUUID());

		this.talkSessionInfo = talkSessionInfo;

		return talkSessionInfo;
  }

  async updateCurrentSessionItems(sessionItems: SessionItem[]) {
    
    const currSessionItemMap = this.sessionItemMap;

    for(const sessionItem of sessionItems) {

        if(!this.talkSessionInfo) {
            throw new Error("Talk session 정보가 없습니다. 먼저 createTalkSession()을 호출하세요.");
        }

        // 이미 존재 한다면
        if(currSessionItemMap.has(sessionItem.id)) {
            const existingItem = currSessionItemMap.get(sessionItem.id);

            // 기존 아이템이 존재하고 내용이 동일하다면 건너뜀
            if(existingItem && existingItem.contentText === sessionItem.contentText) {
                continue; 
            }
        }

        // 새로 추가하거나 업데이트
        currSessionItemMap.set(sessionItem.id, sessionItem);

        // 다음의 경우 백엔드에 저장 
        // 1) 이미 존재하는데, 다르다거나 
        // 2) 새로 추가하는 경우
        await this.apiClient.createSessionItem({
            sessionId: this.talkSessionInfo.talkSessionId,
            sessionItemId: sessionItem.id,
            sessionItemRole: sessionItem.role,
            contentText: sessionItem.contentText,
            contentType: sessionItem.contentType,
        }).catch((error: unknown) => {
            // 에러가 발생하면 현재 세션 아이템을 초기화
            console.error("세션 아이템 업데이트 중 오류 발생:", error);
            this.sessionItemMap.clear();
            throw error; // 에러를 다시 던져서 호출한 곳에서 처리하도록 함
        });
    }
  }

  async cancelTalk() {
    if (!this.talkSessionInfo) {
      throw new Error("Talk session 정보가 없습니다. 먼저 createTalkSession()을 호출하세요.");
    }

    await this.apiClient.cancelTalk({ talkId: this.talkSessionInfo.parentTalkId });
  }

  async completeTalk() {
    if (!this.talkSessionInfo) {
      throw new Error("Talk session 정보가 없습니다. 먼저 createTalkSession()을 호출하세요.");
    }

    await this.apiClient.completeTalk({ talkId: this.talkSessionInfo.parentTalkId });
  }
}