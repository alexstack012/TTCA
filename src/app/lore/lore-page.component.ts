import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AuthService } from '../core/auth.service';
import {
  LoreEntry,
  LoreInput,
  PlotPoint,
  PlotPointInput,
  PlotSessionRelationship,
  StoryEntityLink,
  StoryOptions,
} from '../types/campaign-story.types';
import { CampaignStoryService } from './campaign-story.service';

@Component({
  selector: 'app-lore-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './lore-page.component.html',
  styleUrls: ['../section-page/section-page.component.scss', './lore-page.component.scss'],
})
export class LorePageComponent {
  private readonly api = inject(CampaignStoryService);
  readonly auth = inject(AuthService);
  readonly tab = signal<'plot' | 'lore'>('plot');
  readonly lore = signal<LoreEntry[]>([]);
  readonly plots = signal<PlotPoint[]>([]);
  readonly options = signal<StoryOptions>({ entities: [], sessions: [] });
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly selected = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly confirmingDelete = signal(false);
  deleteConfirmation = '';
  loreDraft: LoreInput = this.emptyLore();
  plotDraft: PlotPointInput = this.emptyPlot();
  readonly visibleLore = computed(() =>
    this.lore().filter((x) => this.matches(x.title, x.summary ?? '', x.content)),
  );
  readonly visiblePlots = computed(() =>
    this.plots().filter((x) => this.matches(x.title, x.summary ?? '', x.description)),
  );
  constructor() {
    forkJoin({
      lore: this.api.getLore('curse-of-strahd'),
      plots: this.api.getPlotPoints('curse-of-strahd'),
      options: this.api.getOptions('curse-of-strahd'),
    }).subscribe({
      next: (value) => {
        this.lore.set(value.lore);
        this.plots.set(value.plots);
        this.options.set(value.options);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Lore and plot point request failed.', error);
        this.error.set('The archive of truths could not be opened.');
        this.loading.set(false);
      },
    });
  }
  setTab(value: 'plot' | 'lore') {
    this.tab.set(value);
    this.selected.set(null);
    this.closeForm();
  }
  setSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
  }
  toggle(id: string) {
    this.selected.update((value) => (value === id ? null : id));
  }
  openCreate() {
    if (!this.auth.user()?.canEdit) return;
    this.editingId.set(null);
    this.formError.set('');
    this.confirmingDelete.set(false);
    this.loreDraft = this.emptyLore();
    this.plotDraft = this.emptyPlot();
    this.formOpen.set(true);
  }
  editLore(value: LoreEntry) {
    this.loreDraft = {
      title: value.title,
      summary: value.summary ?? '',
      content: value.content,
      category: value.category,
      visibility: value.visibility,
      isPinned: value.isPinned,
      entityLinks: value.entities.map((x) => ({
        entityId: x.id,
        relationshipLabel: x.relationshipLabel ?? '',
        notes: x.notes ?? '',
      })),
    };
    this.openEdit(value.id);
  }
  editPlot(value: PlotPoint) {
    this.plotDraft = {
      title: value.title,
      summary: value.summary ?? '',
      description: value.description,
      status: value.status,
      priority: value.priority,
      visibility: value.visibility,
      isPinned: value.isPinned,
      entityLinks: value.entities.map((x) => ({
        entityId: x.id,
        relationshipLabel: x.relationshipLabel ?? '',
        notes: x.notes ?? '',
      })),
      sessionLinks: value.sessions.map((x) => ({
        sessionId: x.id,
        relationshipType: x.relationshipType,
        notes: x.notes ?? '',
      })),
    };
    this.openEdit(value.id);
  }
  private openEdit(id: string) {
    if (!this.auth.user()?.canEdit) return;
    this.editingId.set(id);
    this.formError.set('');
    this.formOpen.set(true);
    this.confirmingDelete.set(false);
  }
  closeForm() {
    if (this.saving()) return;
    this.formOpen.set(false);
    this.editingId.set(null);
    this.formError.set('');
    this.confirmingDelete.set(false);
    this.deleteConfirmation = '';
  }
  save() {
    if (!this.auth.user()?.canEdit || this.saving()) return;
    this.saving.set(true);
    this.formError.set('');
    const id = this.editingId();
    const request = (
      this.tab() === 'lore'
        ? id
          ? this.api.updateLore('curse-of-strahd', id, this.loreDraft)
          : this.api.createLore('curse-of-strahd', this.loreDraft)
        : id
          ? this.api.updatePlotPoint('curse-of-strahd', id, this.plotDraft)
          : this.api.createPlotPoint('curse-of-strahd', this.plotDraft)
    ) as Observable<LoreEntry | PlotPoint>;
    request.subscribe({
      next: (value) => {
        if (this.tab() === 'lore')
          this.lore.update((list) => this.upsert(list, value as LoreEntry));
        else this.plots.update((list) => this.upsert(list, value as PlotPoint));
        this.saving.set(false);
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(error.error?.message ?? 'The record could not be saved.');
        this.saving.set(false);
      },
    });
  }
  beginDelete() {
    this.confirmingDelete.set(true);
    this.deleteConfirmation = '';
  }
  deleteRecord() {
    const id = this.editingId();
    if (!id || this.deleteConfirmation !== 'delete' || this.saving()) return;
    this.saving.set(true);
    const type = this.tab() === 'lore' ? 'lore' : 'plot-points';
    this.api.deleteRecord('curse-of-strahd', type, id).subscribe({
      next: () => {
        if (this.tab() === 'lore') this.lore.update((x) => x.filter((v) => v.id !== id));
        else this.plots.update((x) => x.filter((v) => v.id !== id));
        this.saving.set(false);
        this.closeForm();
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(error.error?.message ?? 'The record could not be deleted.');
        this.saving.set(false);
      },
    });
  }
  toggleEntity(target: { entityLinks: StoryEntityLink[] }, id: string, checked: boolean) {
    target.entityLinks = checked
      ? [...target.entityLinks, { entityId: id, relationshipLabel: '', notes: '' }]
      : target.entityLinks.filter((x) => x.entityId !== id);
  }
  entityLink(target: { entityLinks: StoryEntityLink[] }, id: string) {
    return target.entityLinks.find((x) => x.entityId === id);
  }
  toggleSession(id: string, checked: boolean) {
    this.plotDraft.sessionLinks = checked
      ? [
          ...this.plotDraft.sessionLinks,
          { sessionId: id, relationshipType: 'mentioned', notes: '' },
        ]
      : this.plotDraft.sessionLinks.filter((x) => x.sessionId !== id);
  }
  sessionLink(id: string) {
    return this.plotDraft.sessionLinks.find((x) => x.sessionId === id);
  }
  private matches(...values: string[]) {
    const q = this.search().trim().toLowerCase();
    return !q || values.join(' ').toLowerCase().includes(q);
  }
  private upsert<T extends { id: string }>(list: T[], value: T) {
    return [...list.filter((x) => x.id !== value.id), value].sort(
      (a, b) =>
        Number((b as any).isPinned) - Number((a as any).isPinned) ||
        String((a as any).title).localeCompare(String((b as any).title)),
    );
  }
  private emptyLore(): LoreInput {
    return {
      title: '',
      summary: '',
      content: '',
      category: 'other',
      visibility: 'party',
      isPinned: false,
      entityLinks: [],
    };
  }
  private emptyPlot(): PlotPointInput {
    return {
      title: '',
      summary: '',
      description: '',
      status: 'open',
      priority: 'normal',
      visibility: 'party',
      isPinned: false,
      entityLinks: [],
      sessionLinks: [],
    };
  }
}
