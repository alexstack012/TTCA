import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  SpellLevel,
  SpellLevelDefinition,
  SpellReference,
  SpellReferenceData,
  SpellRole,
} from '../types/spell.types';

export interface SpellFilters {
  search: string;
  role: SpellRole | 'all';
  level: SpellLevel | 'all';
  tag: string | 'all';
}

export interface SpellLevelGroup extends SpellLevelDefinition {
  spells: SpellReference[];
}

export const DEFAULT_SPELL_FILTERS: SpellFilters = {
  search: '',
  role: 'all',
  level: 'all',
  tag: 'all',
};

export function filterSpells(spells: SpellReference[], filters: SpellFilters): SpellReference[] {
  const query = filters.search.trim().toLocaleLowerCase();

  return spells.filter((spell) => {
    const matchesRole = filters.role === 'all' || spell.roles.includes(filters.role);
    const matchesLevel = filters.level === 'all' || spell.level === filters.level;
    const matchesTag = filters.tag === 'all' || spell.tags.includes(filters.tag);
    const searchable = [
      spell.name,
      spell.school ?? '',
      spell.summary,
      spell.primaryRole,
      ...spell.roles,
      ...spell.tags,
    ]
      .join(' ')
      .toLocaleLowerCase();

    return matchesRole && matchesLevel && matchesTag && (!query || searchable.includes(query));
  });
}

export function groupSpellsByLevel(
  spells: SpellReference[],
  levelDefinitions: SpellLevelDefinition[],
): SpellLevelGroup[] {
  return [...levelDefinitions]
    .sort((left, right) => left.order - right.order)
    .map((definition) => ({
      ...definition,
      spells: spells
        .filter((spell) => spell.level === definition.level)
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .filter((group) => group.spells.length > 0);
}

export function filtersAreActive(filters: SpellFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.role !== 'all' ||
    filters.level !== 'all' ||
    filters.tag !== 'all'
  );
}

@Component({
  selector: 'app-spells-page',
  standalone: true,
  templateUrl: './spells-page.component.html',
  styleUrl: './spells-page.component.scss',
})
export class SpellsPageComponent {
  private readonly http = inject(HttpClient);
  readonly data = signal<SpellReferenceData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly roleFilter = signal<SpellRole | 'all'>('all');
  readonly levelFilter = signal<SpellLevel | 'all'>('all');
  readonly tagFilter = signal<string | 'all'>('all');

  readonly currentFilters = computed<SpellFilters>(() => ({
    search: this.search(),
    role: this.roleFilter(),
    level: this.levelFilter(),
    tag: this.tagFilter(),
  }));
  readonly hasActiveFilters = computed(() => filtersAreActive(this.currentFilters()));
  readonly visibleSpells = computed(() =>
    filterSpells(this.data()?.spells ?? [], this.currentFilters()),
  );
  readonly groupedSpells = computed(() =>
    groupSpellsByLevel(this.visibleSpells(), this.data()?.display.levelGroups ?? []),
  );
  readonly availableTags = computed(() =>
    [...(this.data()?.filters.tags ?? [])].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  );

  constructor() {
    this.http.get<SpellReferenceData>('/data/dnd-spells-v2.json').subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The grimoire could not be opened. Please try again shortly.');
        this.loading.set(false);
      },
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setRole(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as SpellRole | 'all');
  }

  setLevel(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.levelFilter.set(value === 'all' ? 'all' : (Number(value) as SpellLevel));
  }

  setTag(event: Event): void {
    this.tagFilter.set((event.target as HTMLSelectElement).value);
  }

  clearFilters(): void {
    this.search.set(DEFAULT_SPELL_FILTERS.search);
    this.roleFilter.set(DEFAULT_SPELL_FILTERS.role);
    this.levelFilter.set(DEFAULT_SPELL_FILTERS.level);
    this.tagFilter.set(DEFAULT_SPELL_FILTERS.tag);
  }

  roleName(role: SpellRole): string {
    return this.data()?.filters.roles.find((item) => item.id === role)?.name ?? role;
  }

  tagName(tagId: string): string {
    return this.data()?.filters.tags.find((tag) => tag.id === tagId)?.name ?? tagId;
  }
}
