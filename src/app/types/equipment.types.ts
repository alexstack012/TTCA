export interface EquipmentReferenceData {
  schemaVersion: number;
  collection: EquipmentCollectionReference;
  normalizationNotes: string[];
  magicWeaponEnhancements: MagicWeaponEnhancement[];
  weaponProperties: WeaponPropertyDefinition[];
  weapons: Weapon[];
  armor: ArmorItem[];
  ammunition: AmmunitionItem[];
  referenceRules: EquipmentReferenceRules;
}

export interface EquipmentCollectionReference {
  id: string;
  name: string;
  rulesEdition: string;
}
export interface EquipmentReferenceRules {
  silvering: { cost: CurrencyCost; appliesTo: string; summary: string };
  heavyArmorStrength: { summary: string };
  armorProficiency: { summary: string };
}
export interface MagicWeaponEnhancement {
  id: string;
  name: string;
  enhancementBonus: 1 | 2 | 3;
  attackBonus: number;
  damageBonus: number;
  typicalRarity: ItemRarity;
}
export interface WeaponPropertyDefinition {
  id: WeaponProperty;
  name: string;
  summary: string;
}
export interface Weapon {
  id: string;
  name: string;
  image?: string | null;
  proficiency: WeaponProficiency;
  category: WeaponCategory;
  damage?: WeaponDamage;
  cost: CurrencyCost;
  weight: EquipmentWeight;
  properties: WeaponProperty[];
  range?: WeaponRange;
  versatileDamage?: string;
  specialRule?: string;
  origin: EquipmentOrigin;
}
export interface WeaponDamage {
  dice: string;
  type: PhysicalDamageType;
  display: string;
}
export interface WeaponRange {
  normalFeet: number;
  longFeet: number;
  display: string;
}
export interface ArmorItem {
  id: string;
  name: string;
  image?: string | null;
  category: ArmorCategory;
  cost: CurrencyCost;
  armorClass: ArmorClassCalculation;
  strengthRequirement: number | null;
  stealthDisadvantage: boolean;
  weight: EquipmentWeight;
  donTime: string;
  doffTime: string;
  origin: EquipmentOrigin;
}
export interface ArmorClassCalculation {
  base?: number;
  bonus?: number;
  dexterityModifier: DexterityModifierRule;
  dexterityCap?: number;
  display: string;
}
export interface AmmunitionItem {
  id: string;
  name: string;
  image?: string | null;
  quantity: number;
  compatibleWeapons: string[];
  cost: CurrencyCost;
  weight: EquipmentWeight;
  rulesStatus: EquipmentRulesStatus;
  summary: string;
  origin: EquipmentOrigin;
}
export interface CurrencyCost {
  display: string;
  amount?: number;
  currency?: Currency;
  minAmount?: number;
  maxAmount?: number;
  perUnit?: boolean;
}
export interface EquipmentWeight {
  display: string;
  pounds?: number;
}
export type WeaponProficiency = 'simple' | 'martial';
export type WeaponCategory = 'melee' | 'ranged';
export type WeaponProperty =
  | 'ammunition'
  | 'finesse'
  | 'heavy'
  | 'light'
  | 'loading'
  | 'reach'
  | 'special'
  | 'thrown'
  | 'two-handed'
  | 'versatile';
export type PhysicalDamageType = 'bludgeoning' | 'piercing' | 'slashing';
export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shield';
export type DexterityModifierRule = 'full' | 'capped' | 'none';
export type EquipmentRulesStatus = 'standard' | 'homebrew' | 'optionalVariant';
export type EquipmentOrigin = 'userProvided' | 'standardReferenceAdded';
export type Currency = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'veryRare' | 'legendary' | 'artifact';
