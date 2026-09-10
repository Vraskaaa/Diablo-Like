// Browser local-storage persistence for characters.
// (Full multi-slot stash handling is expanded in the persistence task.)

import { Character, SerializedCharacter } from "./character.js";

const SAVE_KEY = "aetherfall.save.v1";

export function saveCharacter(character: Character): void {
  try {
    const data = JSON.stringify(character.toJSON());
    localStorage.setItem(SAVE_KEY, data);
  } catch (err) {
    console.warn("Aetherfall: failed to save", err);
  }
}

export function loadCharacter(): Character | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SerializedCharacter;
    return Character.fromJSON(data);
  } catch (err) {
    console.warn("Aetherfall: failed to load", err);
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
