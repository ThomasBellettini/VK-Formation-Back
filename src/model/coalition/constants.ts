export const COALITION_IDS = ["orion", "noctis", "pulse"] as const;
export type CoalitionId = (typeof COALITION_IDS)[number];

export function isCoalitionId(v: string): v is CoalitionId {
  return (COALITION_IDS as readonly string[]).includes(v);
}
