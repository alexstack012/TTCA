import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Spell, SpellLevel, SpellReferenceData } from '../types/spell.types';

interface SpellLevelGroup {
  level: SpellLevel;
  label: string;
  spells: Spell[];
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
  readonly categoryFilter = signal('all');
  readonly levelFilter = signal('all');

  readonly visibleSpells = computed(() => {
    const query = this.search().trim().toLowerCase();
    return (this.data()?.spells ?? []).filter((spell) => {
      const matchesCategory =
        this.categoryFilter() === 'all' || spell.categories.includes(this.categoryFilter());
      const matchesLevel =
        this.levelFilter() === 'all' || spell.level === Number(this.levelFilter());
      const searchable = [
        spell.name,
        spell.summary,
        spell.range,
        spell.damage ?? '',
        spell.healing ?? '',
        spell.saveOrAttack ?? '',
        spell.scaling ?? '',
        ...(spell.notes ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return matchesCategory && matchesLevel && (!query || searchable.includes(query));
    });
  });

  readonly groupedSpells = computed<SpellLevelGroup[]>(() => {
    const spells = this.visibleSpells();
    return Array.from({ length: 10 }, (_, level) => ({
      level: level as SpellLevel,
      label: this.levelLabel(level as SpellLevel),
      spells: spells.filter((spell) => spell.level === level),
    })).filter((group) => group.spells.length > 0);
  });

  readonly availableLevels = computed(() =>
    [...new Set((this.data()?.spells ?? []).map((spell) => spell.level))].sort((a, b) => a - b),
  );

  constructor() {
    this.http.get<SpellReferenceData>('/data/dnd-spells.json').subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The grimoire could not be opened.');
        this.loading.set(false);
      },
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setCategory(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
  }

  setLevel(event: Event): void {
    this.levelFilter.set((event.target as HTMLSelectElement).value);
  }

  clearFilters(): void {
    this.search.set('');
    this.categoryFilter.set('all');
    this.levelFilter.set('all');
  }

  levelLabel(level: SpellLevel): string {
    if (level === 0) return 'Cantrips';
    const suffix = level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th';
    return `${level}${suffix} Level`;
  }

  categoryName(categoryId: string): string {
    return (
      this.data()?.categories.find((category) => category.id === categoryId)?.name ??
      categoryId.replaceAll('-', ' ')
    );
  }
}
