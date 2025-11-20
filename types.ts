
export interface TextBubble {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'speech' | 'thought' | 'caption';
}

export interface ComicPanel {
  id: string;
  order: number;
  description: string; // The prompt used to generate
  imageUrl: string | null;
  isLoading: boolean;
  aspectRatio: string;
  bubbles: TextBubble[];
}

export interface StylePreset {
  id: string;
  name: string;
  promptModifier: string;
  thumbnailColor: string;
}

export enum AppMode {
  COMIC_MAKER = 'COMIC_MAKER',
  ANALYZER = 'ANALYZER',
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9';
