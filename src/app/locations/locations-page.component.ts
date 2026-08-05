import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ACTIVE_CAMPAIGN_KEY } from '../core/campaign-context';
import { CampaignLocation, CampaignLocationInput } from '../types/campaign-location.types';
import { CampaignLocationsService } from './campaign-locations.service';

@Component({
  selector: 'app-locations-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './locations-page.component.html',
  styleUrls: ['../shared/archive-records.scss', './locations-page.component.scss'],
})
export class LocationsPageComponent {
  private readonly campaignLocations = inject(CampaignLocationsService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private requestedLocationKey: string | null = null;
  readonly auth = inject(AuthService);
  readonly locations = signal<CampaignLocation[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly visibility = signal('all');
  readonly selectedId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly mutationError = signal('');
  readonly creating = signal(false);
  readonly createSaving = signal(false);
  readonly createError = signal('');
  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  deleteConfirmation = '';
  draft: CampaignLocationInput | null = null;
  createDraft: CampaignLocationInput = this.emptyDraft();

  readonly visibleLocations = computed(() => {
    const query = this.search().trim().toLowerCase();
    return this.locations().filter(
      (location) =>
        (this.visibility() === 'all' || location.visibility === this.visibility()) &&
        (!query ||
          [
            location.name,
            location.description ?? '',
            ...location.sessions.map((session) => session.sessionName),
          ]
            .join(' ')
            .toLowerCase()
            .includes(query)),
    );
  });

  constructor() {
    this.campaignLocations.getLocations(ACTIVE_CAMPAIGN_KEY).subscribe({
      next: (locations) => {
        this.locations.set(locations);
        this.loading.set(false);
        this.focusRequestedLocation();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Campaign location request failed.', error);
        this.error.set(
          error.status === 404
            ? 'The Curse of Strahd campaign could not be found.'
            : 'The atlas could not be opened.',
        );
        this.loading.set(false);
      },
    });
    this.route?.queryParamMap.pipe(takeUntilDestroyed()).subscribe((parameters) => {
      this.requestedLocationKey = parameters.get('location');
      this.focusRequestedLocation();
    });
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }
  setVisibility(event: Event): void {
    this.visibility.set((event.target as HTMLSelectElement).value);
  }

  toggleLocation(id: string): void {
    if (this.saving() || this.deleting()) return;
    this.selectedId.update((selected) => (selected === id ? null : id));
    this.cancelEditing();
  }

  startEditing(location: CampaignLocation): void {
    if (!this.auth.user()?.canEdit) return;
    this.draft = {
      name: location.name,
      description: location.description,
      imageUrl: location.imageUrl,
      visibility: location.visibility,
    };
    this.editingId.set(location.id);
    this.mutationError.set('');
  }

  cancelEditing(): void {
    if (this.saving() || this.deleting()) return;
    this.editingId.set(null);
    this.draft = null;
    this.confirmingDelete.set(false);
    this.deleteConfirmation = '';
    this.mutationError.set('');
  }

  saveLocation(id: string): void {
    if (!this.draft || !this.auth.user()?.canEdit || this.saving()) return;
    this.saving.set(true);
    this.mutationError.set('');
    this.campaignLocations.updateLocation(ACTIVE_CAMPAIGN_KEY, id, this.draft).subscribe({
      next: (updated) => {
        this.locations.update((locations) =>
          locations.map((location) => (location.id === updated.id ? updated : location)),
        );
        this.saving.set(false);
        this.cancelEditing();
      },
      error: (error: HttpErrorResponse) => {
        this.mutationError.set(error.error?.message ?? 'The location could not be saved.');
        this.saving.set(false);
      },
    });
  }

  openCreate(): void {
    if (!this.auth.user()?.canEdit) return;
    this.createDraft = this.emptyDraft();
    this.createError.set('');
    this.creating.set(true);
  }
  closeCreate(): void {
    if (!this.createSaving()) this.creating.set(false);
  }

  createLocation(): void {
    if (!this.auth.user()?.canEdit || this.createSaving()) return;
    this.createSaving.set(true);
    this.createError.set('');
    this.campaignLocations.createLocation(ACTIVE_CAMPAIGN_KEY, this.createDraft).subscribe({
      next: (created) => {
        this.locations.update((locations) =>
          [...locations, created].sort((left, right) => left.name.localeCompare(right.name)),
        );
        this.createSaving.set(false);
        this.creating.set(false);
        this.selectedId.set(created.id);
      },
      error: (error: HttpErrorResponse) => {
        this.createError.set(error.error?.message ?? 'The location could not be created.');
        this.createSaving.set(false);
      },
    });
  }

  beginDelete(): void {
    this.confirmingDelete.set(true);
    this.deleteConfirmation = '';
    this.mutationError.set('');
  }

  deleteLocation(id: string): void {
    if (!this.auth.user()?.canEdit || this.deleteConfirmation !== 'delete' || this.deleting())
      return;
    this.deleting.set(true);
    this.campaignLocations.deleteLocation(ACTIVE_CAMPAIGN_KEY, id).subscribe({
      next: () => {
        this.locations.update((locations) => locations.filter((location) => location.id !== id));
        this.deleting.set(false);
        this.selectedId.set(null);
        this.cancelEditing();
      },
      error: (error: HttpErrorResponse) => {
        this.mutationError.set(error.error?.message ?? 'The location could not be deleted.');
        this.deleting.set(false);
      },
    });
  }

  visibilityLabel(value: CampaignLocation['visibility']): string {
    return value === 'dm_only' ? 'Chronicler only' : value === 'party' ? 'Party' : 'Public';
  }

  private focusRequestedLocation(): void {
    if (!this.requestedLocationKey || !this.locations().length) return;
    const location = this.locations().find(
      (candidate) => candidate.sourceKey === this.requestedLocationKey,
    );
    if (!location) return;

    this.visibility.set('all');
    this.search.set(location.name);
    this.selectedId.set(location.id);
    this.cancelEditing();
    requestAnimationFrame(() =>
      document
        .getElementById(`location-${location.sourceKey}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  }

  private emptyDraft(): CampaignLocationInput {
    return { name: '', description: null, imageUrl: null, visibility: 'party' };
  }
}
