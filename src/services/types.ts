export type SessionUpdatedEvent =  {
  item: SessionItem;
  delta: ItemContentDelta | null;
}

export type SessionItemRole = 'user' | 'assistant';

export type ContentType = 'input_text' | 'input_audio' | 'audio';

export type SessionItemStatus = 'in_progress' | 'completed'; 

export type SessionItem = {
  id: string;
  role: SessionItemRole;
  status: SessionItemStatus;
  contentText: string;
  contentType: ContentType;
}

export type ItemContentDelta = {
  text?: string;
  audio?: Int16Array;
  arguments?: string;
  transcript?: string;
}