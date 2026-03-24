export interface Card {
  id: string;
  name: string;
  cost: number;
  types: string[];
  description: string;
  vp?: number;
  value?: number;
}
