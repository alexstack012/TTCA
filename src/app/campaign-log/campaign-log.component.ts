import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import {
  CampaignSession,
  CampaignEntitySummary,
  CampaignSessionInput,
  CampaignSessionOptions,
  CampaignSessionUpdate,
} from '../types/campaign-session.types';
import { CampaignSessionsService } from './campaign-sessions.service';

@Component({
  selector: 'app-campaign-log',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './campaign-log.component.html',
  styleUrls: ['../section-page/section-page.component.scss', './campaign-log.component.scss'],
})
export class CampaignLogComponent {
  private readonly campaignSessions = inject(CampaignSessionsService);
  readonly auth = inject(AuthService);
  readonly sessions = signal<CampaignSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly selectedSession = signal<string | null>(null);
  readonly editingSession = signal<string | null>(null);
  readonly saving = signal(false);
  readonly mutationError = signal('');
  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  readonly options = signal<CampaignSessionOptions>({ locations: [], entities: [] });
  readonly creating = signal(false);
  readonly createSaving = signal(false);
  readonly createError = signal('');
  readonly createEntitySearch = signal('');
  readonly editEntitySearch = signal('');
  deleteConfirmation = '';
  draft: CampaignSessionUpdate | null = null;
  createDraft: CampaignSessionInput = this.emptyDraft();

  readonly visibleSessions = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.sessions().filter((session) => {
      const searchable = [
        session.sessionName,
        session.description,
        ...session.locations.map((location) => location.name),
        ...session.entities.map((entity) => entity.name),
      ]
        .join(' ')
        .toLowerCase();
      return !query || searchable.includes(query);
    });
  });

  constructor() {
    this.campaignSessions.getSessions('curse-of-strahd').subscribe({
      next: (sessions) => {
        this.sessions.set(
          [...sessions].sort((left, right) => left.sessionNumber - right.sessionNumber),
        );
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Campaign session request failed.', error);
        this.error.set(
          error.status === 404
            ? 'The Curse of Strahd campaign could not be found.'
            : 'The campaign chronicle could not be opened.',
        );
        this.loading.set(false);
      },
    });
    this.campaignSessions.getOptions('curse-of-strahd').subscribe({
      next: (options) => this.options.set(options),
      error: (error: HttpErrorResponse) =>
        console.error('Campaign relationship options failed.', error),
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  toggleSession(sessionId: string): void {
    if (this.saving() || this.deleting()) return;
    this.selectedSession.update((selected) => (selected === sessionId ? null : sessionId));
    this.cancelEditing();
  }

  startEditing(session: CampaignSession): void {
    if (!this.auth.user()?.canEdit) return;
    this.draft = {
      sessionNumber: session.sessionNumber,
      isMultiDay: session.isMultiDay,
      sessionName: session.sessionName,
      visibility: session.visibility,
      description: session.description,
      startedOn: session.startedOn,
      endedOn: session.endedOn,
      locationIds: session.locations.map((location) => location.id),
      entityIds: session.entities.map((entity) => entity.id),
    };
    this.editingSession.set(session.id);
    this.editEntitySearch.set('');
    this.confirmingDelete.set(false);
    this.mutationError.set('');
  }

  cancelEditing(): void {
    if (this.saving() || this.deleting()) return;
    this.editingSession.set(null);
    this.editEntitySearch.set('');
    this.draft = null;
    this.confirmingDelete.set(false);
    this.deleteConfirmation = '';
    this.mutationError.set('');
  }

  saveSession(sessionId: string): void {
    if (!this.draft || !this.auth.user()?.canEdit || this.saving()) return;
    this.saving.set(true);
    this.mutationError.set('');
    this.campaignSessions.updateSession('curse-of-strahd', sessionId, this.draft).subscribe({
      next: (updated) => {
        this.sessions.update((sessions) =>
          sessions
            .map((session) => (session.id === updated.id ? updated : session))
            .sort((left, right) => left.sessionNumber - right.sessionNumber),
        );
        this.saving.set(false);
        this.cancelEditing();
      },
      error: (error: HttpErrorResponse) => {
        this.mutationError.set(error.error?.message ?? 'The campaign session could not be saved.');
        this.saving.set(false);
      },
    });
  }

  beginDelete(): void {
    this.confirmingDelete.set(true);
    this.deleteConfirmation = '';
    this.mutationError.set('');
  }

  openCreate(): void {
    if (!this.auth.user()?.canEdit) return;
    const highest = this.sessions().reduce(
      (maximum, session) => Math.max(maximum, session.sessionNumber),
      0,
    );
    this.createDraft = { ...this.emptyDraft(), sessionNumber: highest + 1 };
    this.createEntitySearch.set('');
    this.createError.set('');
    this.creating.set(true);
  }

  closeCreate(): void {
    if (!this.createSaving()) {
      this.creating.set(false);
      this.createEntitySearch.set('');
    }
  }

  createSession(): void {
    if (!this.auth.user()?.canEdit || this.createSaving()) return;
    this.createSaving.set(true);
    this.createError.set('');
    this.campaignSessions.createSession('curse-of-strahd', this.createDraft).subscribe({
      next: (created) => {
        this.sessions.update((sessions) =>
          [...sessions, created].sort((left, right) => left.sessionNumber - right.sessionNumber),
        );
        this.createSaving.set(false);
        this.creating.set(false);
        this.selectedSession.set(created.id);
      },
      error: (error: HttpErrorResponse) => {
        this.createError.set(error.error?.message ?? 'The campaign session could not be created.');
        this.createSaving.set(false);
      },
    });
  }

  toggleRelationship(
    target: CampaignSessionInput,
    property: 'locationIds' | 'entityIds',
    id: string,
    checked: boolean,
  ): void {
    target[property] = checked
      ? [...new Set([...target[property], id])]
      : target[property].filter((value) => value !== id);
  }

  setEntitySearch(target: 'create' | 'edit', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    (target === 'create' ? this.createEntitySearch : this.editEntitySearch).set(value);
  }

  filteredEntities(query: string): CampaignEntitySummary[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return this.options().entities;

    return this.options().entities.filter((entity) =>
      [entity.name, entity.entityType, entity.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }

  private emptyDraft(): CampaignSessionInput {
    return {
      sessionNumber: 1,
      isMultiDay: false,
      sessionName: '',
      visibility: 'party',
      description: '',
      startedOn: null,
      endedOn: null,
      locationIds: [],
      entityIds: [],
    };
  }

  deleteSession(sessionId: string): void {
    if (!this.auth.user()?.canEdit || this.deleteConfirmation !== 'delete' || this.deleting())
      return;
    this.deleting.set(true);
    this.mutationError.set('');
    this.campaignSessions.deleteSession('curse-of-strahd', sessionId).subscribe({
      next: () => {
        this.sessions.update((sessions) => sessions.filter((session) => session.id !== sessionId));
        this.deleting.set(false);
        this.selectedSession.set(null);
        this.cancelEditing();
      },
      error: (error: HttpErrorResponse) => {
        this.mutationError.set(
          error.error?.message ?? 'The campaign session could not be deleted.',
        );
        this.deleting.set(false);
      },
    });
  }

  visibilityLabel(visibility: CampaignSession['visibility']): string {
    if (visibility === 'dm_only') return 'Chronicler only';
    return visibility === 'party' ? 'Party' : 'Public';
  }

  dateLabel(session: CampaignSession): string {
    if (!session.startedOn) return 'Date unrecorded';
    if (session.isMultiDay && session.endedOn && session.endedOn !== session.startedOn) {
      return `${session.startedOn} – ${session.endedOn}`;
    }
    return session.startedOn;
  }
}
