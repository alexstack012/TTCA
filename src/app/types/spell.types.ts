export type SpellLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type SpellRole =
  'offense' | 'defense' | 'control' | 'support' | 'mobility' | 'healing' | 'utility';

export interface SpellReferenceData {
  schemaVersion: 3;
  collection: SpellCollectionReference;
  display: SpellDisplayConfiguration;
  filters: SpellFilterConfiguration;
  normalizationNotes: string[];
  spells: SpellReference[];
}

export interface SpellCollectionReference {
  id: string;
  name: string;
  ruleset: string;
  description: string;
}

export interface SpellDisplayConfiguration {
  defaultGroupBy: 'level';
  defaultSortWithinGroup: 'name';
  levelGroups: SpellLevelDefinition[];
}

export interface SpellLevelDefinition {
  level: SpellLevel;
  label: string;
  order: number;
}

export interface SpellFilterConfiguration {
  roles: SpellRoleDefinition[];
  tags: SpellTagDefinition[];
}

export interface SpellRoleDefinition {
  id: SpellRole;
  name: string;
  description: string;
  order: number;
}

export interface SpellTagDefinition {
  id: string;
  name: string;
  group: string;
}

export interface SpellReference {
  id: string;
  name: string;
  level: SpellLevel;
  school?: string;
  primaryRole: SpellRole;
  roles: SpellRole[];
  tags: string[];
  range?: string;
  summary: string;
  damage?: string;
  healing?: string;
  saveOrAttack?: string;
  scaling?: string;
  notes?: string[];
}
