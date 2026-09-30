import entries from "./catalog.json";
import type prayers from "./prayers.json";
export type Prayer = (typeof prayers)[number];
export const categories = [
  "Prayers and hymns",
  "Reflections on prayer",
  "Related voices",
];
export const catalog = categories.flatMap((category) =>
  entries.filter((entry) => entry.category === category),
);
