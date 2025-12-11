export interface MemeText {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface Template {
  id: string;
  url: string;
  name: string;
}

export enum AppMode {
  CAPTION = 'CAPTION',
  EDIT = 'EDIT',
}

export interface GeneratedCaption {
  text: string;
}
