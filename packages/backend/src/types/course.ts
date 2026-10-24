export type CardType = "EXPLANATION" | "POPUP_QUIZ" | "DRAG_DROP";

export interface CourseCard {
  id: string;
  type: CardType;
  title: string;
  content: Record<string, unknown>;
}

export interface CourseLevel {
  id: string;
  levelNumber: number;
  title: string;
  isFree: boolean;
  x402CostUSDC?: string;
  cards: CourseCard[];
}

export interface Course {
  id: string;
  title: string;
  creatorWallet: string;
  levels: CourseLevel[];
}
