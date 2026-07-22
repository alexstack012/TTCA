export interface SpellReferenceData {
  schemaVersion: number;
  collection: SpellCollectionReference;
  normalizationNotes: string[];
  referenceRules: SpellReferenceRules;
  categories: SpellCategory[];
  spells: Spell[];
}

export interface SpellCollectionReference {
  id: string;
  name: string;
}

export interface SpellReferenceRules {
  damageScaling: {
    summary: string;
    caveat: string;
  };
  cantripScaling: {
    summary: string;
    characterLevels: number[];
  };
  commonSavesByType: CommonSaveReference[];
}

export interface CommonSaveReference {
  type: string;
  abilities: SavingThrowAbility[];
}

export interface SpellCategory {
  id: string;
  name: string;
  order: number;
}

export interface Spell {
  id: string;
  name: string;
  /** Root-relative public path, for example `/images/spells/acid-splash.webp`. */
  image?: string | null;
  /** Cantrips are represented as level 0. */
  level: SpellLevel;
  isCantrip: boolean;
  categories: string[];
  range: string;
  summary: string;
  damage?: string;
  healing?: string;
  saveOrAttack?: string;
  scaling?: string;
  notes?: string[];
}

export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type SavingThrowAbility = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
