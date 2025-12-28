export interface StockChecklist {
  insider: boolean;
  volume: boolean;
  obv: boolean;
  adx: boolean;
  margemLiquida: boolean;
  dividendYield: boolean;
  magicFormula: boolean;
  distanciaMedia200: boolean;
  upside: boolean;
  plAverage: boolean;
  rent: boolean;
}

export interface Stock {
  id?: string;
  symbol: string;
  currentPrice: number;
  distanceNegative: number;
  distancePositive: number;
  targetPrice?: number;
  upside?: number;
  checklist: StockChecklist;
  score: number;
  cpf: string;
  media200?: number;
  observerTo?: "C" | "V";
  dateLastCheck?: string;
  averagePercent200?: number;
  plAverage?: number;
  pl?: number;
  plTarget?: number;
  plTargetPercent?: number;
  plTargetPrice?: number;
  dividendYield?: number;
  dividendYieldTarget?: number;
  dividendYieldTargetPercent?: number;
  dividendYieldTargetPrice?: number;
  rentUrl?: string | null;
  annotations?: Annotation[];

}

export interface Annotation {
  date: string;
  text: string;
  type: "info" | "warning" | "error";
}

export interface StockAPIResponse {
  totalCount: number;
  data: Array<{
    s: string;
    d: Array<string | number>;
  }>;
}
