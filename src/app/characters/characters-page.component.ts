import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { ACTIVE_CAMPAIGN_KEY } from '../core/campaign-context';
import {
  CampaignEntity,
  CampaignEntityType,
  CreateCampaignEntityRequest,
  EntityContextType,
  EntitySectionEntry,
} from '../types/archive.types';
import { CampaignEntitiesService } from './campaign-entities.service';

interface CharacterSection {
  id: string;
  name: string;
  order: number;
}

interface CharacterRecord {
  entity: CampaignEntity;
  entry: EntitySectionEntry;
  section: CharacterSection;
}

@Component({
  selector: 'app-characters-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './characters-page.component.html',
  styleUrl: './characters-page.component.scss',
})
export class CharactersPageComponent {
  readonly newSectionValue = '__new__';
  private readonly campaignEntities = inject(CampaignEntitiesService);
  private dialogTrigger: HTMLElement | null = null;
  private imageTrigger: HTMLElement | null = null;
  readonly auth = inject(AuthService);
  readonly entities = signal<CampaignEntity[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly sectionFilter = signal('all');
  readonly typeFilter = signal('all');
  readonly selectedEntity = signal<CampaignEntity | null>(null);
  readonly expandedImage = signal<{ url: string; alt: string } | null>(null);
  readonly draft = signal<CampaignEntity | null>(null);
  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly dialogError = signal('');
  aliasesText = '';
  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal('');
  deleteConfirmation = '';
  readonly creating = signal(false);
  readonly createSaving = signal(false);
  readonly createError = signal('');
  createAliasesText = '';
  createContextType: EntityContextType = 'firstMeeting';
  createContextValue = '';
  createDraft: CreateCampaignEntityRequest = this.emptyCreateDraft();

  readonly sections = computed<CharacterSection[]>(() => {
    const sections = new Map<string, CharacterSection>();
    for (const entity of this.entities()) {
      for (const entry of entity.sectionEntries) {
        sections.set(entry.sectionId, {
          id: entry.sectionId,
          name: entry.sectionName,
          order: entry.sectionOrder,
        });
      }
    }
    return [...sections.values()].sort((left, right) => left.order - right.order);
  });

  readonly records = computed<CharacterRecord[]>(() =>
    this.entities().flatMap((entity) =>
      entity.sectionEntries.map((entry) => ({
        entity,
        entry,
        section: {
          id: entry.sectionId,
          name: entry.sectionName,
          order: entry.sectionOrder,
        },
      })),
    ),
  );

  readonly visibleRecords = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.records().filter(({ entity, entry }) => {
      const matchesSection =
        this.sectionFilter() === 'all' || entry.sectionId === this.sectionFilter();
      const matchesType = this.typeFilter() === 'all' || entity.entityType === this.typeFilter();
      const searchable = [
        entity.name,
        ...entity.aliases,
        entry.details.value,
        entry.status,
        entry.context?.value ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return matchesSection && matchesType && (!query || searchable.includes(query));
    });
  });

  readonly groupedRecords = computed(() => {
    const records = this.visibleRecords();
    return this.sections()
      .map((section) => ({
        section,
        records: records.filter((record) => record.section.id === section.id),
      }))
      .filter((group) => group.records.length > 0);
  });

  readonly entityTypes = computed(() =>
    [...new Set(this.entities().map((entity) => entity.entityType))].sort(),
  );

  constructor() {
    this.campaignEntities.getEntities(ACTIVE_CAMPAIGN_KEY).subscribe({
      next: (entities) => {
        this.entities.set(entities);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(
          error.status === 404
            ? 'The Curse of Strahd campaign was not found.'
            : 'The character ledger could not be opened.',
        );
        this.loading.set(false);
      },
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setSection(event: Event): void {
    this.sectionFilter.set((event.target as HTMLSelectElement).value);
  }

  setType(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }

  clearFilters(): void {
    this.search.set('');
    this.sectionFilter.set('all');
    this.typeFilter.set('all');
  }

  openEntity(entity: CampaignEntity): void {
    this.dialogTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.selectedEntity.set(entity);
    this.draft.set(structuredClone(entity));
    this.aliasesText = entity.aliases.join(', ');
    this.editing.set(false);
    this.dialogError.set('');
    this.resetDeleteConfirmation();
    this.focusOpenDialog('.character-dialog');
  }

  openImage(url: string, alt: string, event: Event): void {
    event.stopPropagation();
    this.imageTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.expandedImage.set({ url, alt });
    this.focusOpenDialog('.image-lightbox [role="dialog"]');
  }

  closeImage(): void {
    this.expandedImage.set(null);
    this.restoreFocus(this.imageTrigger);
    this.imageTrigger = null;
  }

  closeDialog(): void {
    if (this.saving() || this.deleting()) return;
    this.selectedEntity.set(null);
    this.draft.set(null);
    this.editing.set(false);
    this.restoreFocus(this.dialogTrigger);
    this.dialogTrigger = null;
  }

  beginDelete(): void {
    if (!this.auth.user()?.canEdit) return;
    this.confirmingDelete.set(true);
    this.deleteConfirmation = '';
    this.deleteError.set('');
  }

  cancelDelete(): void {
    if (!this.deleting()) this.resetDeleteConfirmation();
  }

  deleteEntity(): void {
    const entity = this.selectedEntity();
    if (
      !entity ||
      !this.auth.user()?.canEdit ||
      this.deleteConfirmation !== 'delete' ||
      this.deleting()
    )
      return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.campaignEntities.deleteEntity(ACTIVE_CAMPAIGN_KEY, entity.id).subscribe({
      next: () => {
        this.entities.update((entities) => entities.filter((item) => item.id !== entity.id));
        this.deleting.set(false);
        this.closeDialog();
        this.resetDeleteConfirmation();
      },
      error: (error: HttpErrorResponse) => {
        this.deleteError.set(error.error?.message ?? 'The character could not be deleted.');
        this.deleting.set(false);
      },
    });
  }

  private resetDeleteConfirmation(): void {
    this.confirmingDelete.set(false);
    this.deleteConfirmation = '';
    this.deleteError.set('');
  }

  startEditing(): void {
    if (this.auth.user()?.canEdit) this.editing.set(true);
  }

  cancelEditing(): void {
    const selected = this.selectedEntity();
    if (selected) {
      this.draft.set(structuredClone(selected));
      this.aliasesText = selected.aliases.join(', ');
    }
    this.editing.set(false);
    this.dialogError.set('');
  }

  saveEntity(): void {
    const draft = this.draft();
    if (!draft || !this.auth.user()?.canEdit || this.saving()) return;
    const update = {
      ...draft,
      aliases: this.aliasesText
        .split(',')
        .map((alias) => alias.trim())
        .filter(Boolean),
    };
    this.saving.set(true);
    this.dialogError.set('');
    this.campaignEntities.updateEntity(ACTIVE_CAMPAIGN_KEY, update).subscribe({
      next: (entity) => {
        this.entities.update((entities) =>
          entities.map((item) => (item.id === entity.id ? entity : item)),
        );
        this.selectedEntity.set(entity);
        this.draft.set(structuredClone(entity));
        this.aliasesText = entity.aliases.join(', ');
        this.editing.set(false);
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.dialogError.set(error.error?.message ?? 'The character record could not be saved.');
        this.saving.set(false);
      },
    });
  }

  openCreate(): void {
    if (!this.auth.user()?.canEdit) return;
    this.dialogTrigger =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.createDraft = this.emptyCreateDraft();
    this.createDraft.sectionId = this.sections()[0]?.id ?? this.newSectionValue;
    this.createAliasesText = '';
    this.createContextType = 'firstMeeting';
    this.createContextValue = '';
    this.createError.set('');
    this.creating.set(true);
    this.focusOpenDialog('.create-dialog');
  }

  closeCreate(): void {
    if (!this.createSaving()) {
      this.creating.set(false);
      this.restoreFocus(this.dialogTrigger);
      this.dialogTrigger = null;
    }
  }

  @HostListener('document:keydown.escape')
  closeTopmostOverlay(): void {
    if (this.expandedImage()) {
      this.closeImage();
    } else if (this.creating()) {
      this.closeCreate();
    } else if (this.selectedEntity()) {
      this.closeDialog();
    }
  }

  trapDialogFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const dialog = event.currentTarget as HTMLElement;
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.hasAttribute('hidden'));
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusOpenDialog(selector: string): void {
    setTimeout(() => {
      const dialog = document.querySelector<HTMLElement>(selector);
      const firstControl = dialog?.querySelector<HTMLElement>(
        'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      (firstControl ?? dialog)?.focus();
    });
  }

  private restoreFocus(element: HTMLElement | null): void {
    setTimeout(() => element?.focus());
  }

  saveCreatedEntity(): void {
    if (!this.auth.user()?.canEdit || this.createSaving()) return;
    const request: CreateCampaignEntityRequest = {
      ...this.createDraft,
      newSectionName:
        this.createDraft.sectionId === this.newSectionValue
          ? this.createDraft.newSectionName?.trim()
          : undefined,
      aliases: this.createAliasesText
        .split(',')
        .map((alias) => alias.trim())
        .filter(Boolean),
      context: this.createContextValue.trim()
        ? { type: this.createContextType, value: this.createContextValue.trim() }
        : null,
    };
    this.createSaving.set(true);
    this.createError.set('');
    this.campaignEntities.createEntity(ACTIVE_CAMPAIGN_KEY, request).subscribe({
      next: (entity) => {
        this.entities.update((entities) =>
          [...entities, entity].sort((left, right) => left.name.localeCompare(right.name)),
        );
        this.createSaving.set(false);
        this.creating.set(false);
        this.openEntity(entity);
      },
      error: (error: HttpErrorResponse) => {
        this.createError.set(error.error?.message ?? 'The character could not be created.');
        this.createSaving.set(false);
      },
    });
  }

  private emptyCreateDraft(): CreateCampaignEntityRequest {
    return {
      name: '',
      entityType: 'npc',
      visibility: 'public',
      imageUrl: null,
      description: null,
      aliases: [],
      sectionId: '',
      newSectionName: '',
      details: { type: 'notableInformation', value: '' },
      status: 'Alive',
      context: null,
    };
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join('');
  }

  typeLabel(type: CampaignEntityType | string): string {
    return type.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
  }

  missingNewSectionName(entries: EntitySectionEntry[]): boolean {
    return entries.some(
      (entry) => entry.sectionId === this.newSectionValue && !entry.newSectionName?.trim(),
    );
  }
}
