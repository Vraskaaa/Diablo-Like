// Browser local-storage persistence for characters.
// (Full multi-slot stash handling is expanded in the persistence task.)
import { Character } from "./character.js";
const SAVE_KEY = "aetherfall.save.v1";
export function saveCharacter(character) {
    try {
        const data = JSON.stringify(character.toJSON());
        localStorage.setItem(SAVE_KEY, data);
    }
    catch (err) {
        console.warn("Aetherfall: failed to save", err);
    }
}
export function loadCharacter() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw)
            return null;
        const data = JSON.parse(raw);
        return Character.fromJSON(data);
    }
    catch (err) {
        console.warn("Aetherfall: failed to load", err);
        return null;
    }
}
export function hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
}
export function clearSave() {
    localStorage.removeItem(SAVE_KEY);
}
//# sourceMappingURL=persistence.js.map