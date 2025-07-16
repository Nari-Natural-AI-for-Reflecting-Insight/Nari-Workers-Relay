export type TalkUpdatedEvent =  {
  item: {
    id: string;
  };
  delta: ItemContentDelta | null;
}

export type ItemContentDelta = {
  text?: string;
  audio?: Int16Array;
  arguments?: string;
  transcript?: string;
}