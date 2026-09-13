import entries from "./catalog.json";
export const catalog = entries;
import type prayers from "./prayers.json";
export type Prayer = (typeof prayers)[number];
export const categories = [
  "Prayers and hymns",
  "Reflections on prayer",
  "Related voices",
];
