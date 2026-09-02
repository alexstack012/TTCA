import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SpellLevelDefinition, SpellReference } from '../types/spell.types';
import {
  DEFAULT_SPELL_FILTERS,
  SpellFilters,
  SpellsPageComponent,
  filterSpells,
  groupSpellsByLevel,
} from './spells-page.component';

const levels: SpellLevelDefinition[] = [
  { level: 1, label: '1st Level', order: 1 },
  { level: 0, label: 'Cantrips', order: 0 },
  { level: 2, label: '2nd Level', order: 2 },
];

const spells: SpellReference[] = [
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    primaryRole: 'defense',
    roles: ['defense'],
    tags: ['protection'],
    summary: 'A sudden barrier of magical force.',
  },
  {
    id: 'acid-splash',
    name: 'Acid Splash',
    level: 0,
    school: 'Conjuration',
    primaryRole: 'offense',
    roles: ['offense'],
    tags: ['damage', 'acid'],
    summary: 'Hurl acid at nearby creatures.',
  },
  {
    id: 'aid',
    name: 'Aid',
    level: 2,
    school: 'Abjuration',
    primaryRole: 'support',
    roles: ['support', 'healing'],
    tags: ['healing', 'buff'],
    summary: 'Bolsters allies with resolve and vitality.',
  },
  {
    id: 'alarm',
    name: 'Alarm',
    level: 1,
    primaryRole: 'utility',
    roles: ['utility'],
    tags: ['ward'],
    summary: 'Warns against unwanted intrusion.',
  },
];

function filters(overrides: Partial<SpellFilters> = {}): SpellFilters {
  return { ...DEFAULT_SPELL_FILTERS, ...overrides };
}

describe('spell filtering and grouping', () => {
  it('groups cantrips using level 0 and follows configured level order', () => {
    const groups = groupSpellsByLevel(spells, levels);
    expect(groups.map((group) => group.label)).toEqual(['Cantrips', '1st Level', '2nd Level']);
    expect(groups[0].spells.map((spell) => spell.id)).toEqual(['acid-splash']);
  });

  it('sorts spells alphabetically inside each level', () => {
    const firstLevel = groupSpellsByLevel(spells, levels).find((group) => group.level === 1);
    expect(firstLevel?.spells.map((spell) => spell.name)).toEqual(['Alarm', 'Shield']);
  });

  it('filters against every role rather than only primaryRole', () => {
    expect(filterSpells(spells, filters({ role: 'healing' })).map((spell) => spell.name)).toEqual([
      'Aid',
    ]);
  });

  it('filters by level', () => {
    expect(filterSpells(spells, filters({ level: 0 })).map((spell) => spell.name)).toEqual([
      'Acid Splash',
    ]);
  });

  it('searches names, schools, summaries, roles, and tags case-insensitively', () => {
    expect(filterSpells(spells, filters({ search: 'CONJURATION' }))[0].name).toBe('Acid Splash');
    expect(filterSpells(spells, filters({ search: 'intrusion' }))[0].name).toBe('Alarm');
    expect(filterSpells(spells, filters({ search: 'protection' }))[0].name).toBe('Shield');
  });

  it('combines search, role, level, and tag filters', () => {
    expect(
      filterSpells(
        spells,
        filters({ search: 'vitality', role: 'healing', level: 2, tag: 'buff' }),
      ).map((spell) => spell.name),
    ).toEqual(['Aid']);
  });

  it('hides level sections that have no matching spells', () => {
    const visible = filterSpells(spells, filters({ role: 'defense' }));
    expect(groupSpellsByLevel(visible, levels).map((group) => group.level)).toEqual([1]);
  });
});

describe('SpellsPageComponent', () => {
  it('loads schema v3 data and resets every filter', () => {
    TestBed.configureTestingModule({
      imports: [SpellsPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(SpellsPageComponent);
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('/data/dnd-spells-v2.json');
    expect(request.request.method).toBe('GET');

    component.search.set('acid');
    component.roleFilter.set('offense');
    component.levelFilter.set(0);
    component.tagFilter.set('damage');
    component.clearFilters();

    expect(component.currentFilters()).toEqual(DEFAULT_SPELL_FILTERS);
    request.flush({
      schemaVersion: 3,
      collection: { id: 'spells', name: 'Spells', ruleset: '5e', description: 'Reference' },
      display: {
        defaultGroupBy: 'level',
        defaultSortWithinGroup: 'name',
        levelGroups: levels,
      },
      filters: { roles: [], tags: [] },
      normalizationNotes: [],
      spells: [],
    });
    http.verify();
  });
});
