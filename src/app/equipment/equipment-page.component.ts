import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AmmunitionItem,
  ArmorItem,
  EquipmentReferenceData,
  Weapon,
} from '../types/equipment.types';

type CatalogueItem =
  | { kind: 'weapon'; item: Weapon }
  | { kind: 'armor'; item: ArmorItem }
  | { kind: 'ammunition'; item: AmmunitionItem };

@Component({
  selector: 'app-equipment-page',
  standalone: true,
  templateUrl: './equipment-page.component.html',
  styleUrl: './equipment-page.component.scss',
})
export class EquipmentPageComponent {
  private readonly http = inject(HttpClient);
  readonly data = signal<EquipmentReferenceData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly kindFilter = signal('all');
  readonly categoryFilter = signal('all');

  readonly items = computed<CatalogueItem[]>(() => {
    const data = this.data();
    return data
      ? [
          ...data.weapons.map((item): CatalogueItem => ({ kind: 'weapon', item })),
          ...data.armor.map((item): CatalogueItem => ({ kind: 'armor', item })),
          ...data.ammunition.map((item): CatalogueItem => ({ kind: 'ammunition', item })),
        ]
      : [];
  });

  readonly categoryOptions = computed(() => {
    const kind = this.kindFilter();
    if (kind === 'weapon') return ['melee', 'ranged'];
    if (kind === 'armor') return ['light', 'medium', 'heavy', 'shield'];
    return [];
  });

  readonly visibleItems = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.items().filter((record) => {
      const matchesKind = this.kindFilter() === 'all' || record.kind === this.kindFilter();
      const category = record.kind === 'ammunition' ? '' : record.item.category;
      const matchesCategory = this.categoryFilter() === 'all' || category === this.categoryFilter();
      const searchable = JSON.stringify(record.item).toLowerCase();
      return matchesKind && matchesCategory && (!query || searchable.includes(query));
    });
  });

  readonly groups = computed(() =>
    [
      {
        id: 'weapon',
        title: 'Weapons',
        eyebrow: 'Instruments of conflict',
        items: this.visibleItems().filter((item) => item.kind === 'weapon'),
      },
      {
        id: 'armor',
        title: 'Armor & Shields',
        eyebrow: 'Wards of steel and leather',
        items: this.visibleItems().filter((item) => item.kind === 'armor'),
      },
      {
        id: 'ammunition',
        title: 'Ammunition',
        eyebrow: 'Shot, quarrels, and charges',
        items: this.visibleItems().filter((item) => item.kind === 'ammunition'),
      },
    ].filter((group) => group.items.length),
  );

  constructor() {
    this.http.get<EquipmentReferenceData>('/data/dnd-weapons-armor.json').subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('The quartermaster’s catalogue could not be opened.');
        this.loading.set(false);
      },
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
  setKind(event: Event): void {
    this.kindFilter.set((event.target as HTMLSelectElement).value);
    this.categoryFilter.set('all');
  }
  setCategory(event: Event): void {
    this.categoryFilter.set((event.target as HTMLSelectElement).value);
  }
  clearFilters(): void {
    this.search.set('');
    this.kindFilter.set('all');
    this.categoryFilter.set('all');
  }
  label(value: string): string {
    return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('-', ' ');
  }
}
