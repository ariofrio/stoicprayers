import prayers from "./prayers.json";
export function getPrayer(id: string) {
  return prayers.find((prayer) => prayer.id === id);
}
