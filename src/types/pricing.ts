export interface PriceEntry {
  id: string;
  gameName: string;
  minutes: number;
  people: number;
  cost: number;
  fee: number;
  price: number;
  profit: number;
  profitRate: number;
  profitPerMin: number;
  pricePerPerson: number;
  createdAt: string;
}

export interface Preset {
  id: string;
  label: string;
  minutes: number;
  people: number;
  cost: number;
  fee: number;
  price: number;
  isSystem: boolean;
}

export interface Game {
  id: string;
  name: string;
  presets: Preset[];
  history: PriceEntry[];
}

export interface FormData {
  gameName: string;
  minutes: number;
  people: number;
  cost: number;
  fee: number;
  price: number;
}

export interface CalculatedStats {
  profit: number;
  profitRate: number;
  profitPerMin: number;
  pricePerPerson: number;
}

export const DEFAULT_PRESETS: Omit<Preset, 'id'>[] = [
  { label: '30分/1人', minutes: 30, people: 1, cost: 900, fee: 100, price: 1800, isSystem: true },
  { label: '40分/1人', minutes: 40, people: 1, cost: 1000, fee: 200, price: 2000, isSystem: true },
  { label: '60分/1人', minutes: 60, people: 1, cost: 1300, fee: 200, price: 2500, isSystem: true },
  { label: '60分/2人', minutes: 60, people: 2, cost: 1700, fee: 200, price: 3000, isSystem: true },
  { label: '90分/2人', minutes: 90, people: 2, cost: 2200, fee: 200, price: 3800, isSystem: true },
];
