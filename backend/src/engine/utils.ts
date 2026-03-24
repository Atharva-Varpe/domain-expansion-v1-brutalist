import { randomInt } from "crypto";

/**
 * Shuffles an array in place using the Fisher-Yates algorithm and a cryptographically secure
 * random number generator.
 * @param array The array to shuffle.
 * @returns The shuffled array.
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}
