export interface FlashcardItem {
  front: string;
  back: string;
  originalIndex?: number;
}

export interface Category {
  id: string;
  file: string;
  title: string;
  subtitle: string;
  cardCount: number;
  cards: FlashcardItem[];
  domain: string;
  domainIcon: string;
  index: number;
}

export interface Question {
  id: number;
  category: string;
  domain: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface UserState {
  studiedCards: Record<string, boolean>;
  favoriteCards: Record<string, boolean>;
  theme: 'dark' | 'light';
  simuladoAnswers: Record<number, number>;
  simuladoCompleted: boolean;
  simuladoTimeSeconds: number;
}
