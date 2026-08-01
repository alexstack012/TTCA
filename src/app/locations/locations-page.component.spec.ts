import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { CampaignLocation } from '../types/campaign-location.types';
import { CampaignLocationsService } from './campaign-locations.service';
import { LocationsPageComponent } from './locations-page.component';

describe('LocationsPageComponent', () => {
  let fixture: ComponentFixture<LocationsPageComponent>;
  let locations$: Subject<CampaignLocation[]>;

  beforeEach(async () => {
    locations$ = new Subject<CampaignLocation[]>();
    await TestBed.configureTestingModule({
      imports: [LocationsPageComponent],
      providers: [
        { provide: CampaignLocationsService, useValue: { getLocations: () => locations$ } },
        { provide: AuthService, useValue: { user: signal({ canEdit: false }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LocationsPageComponent);
    fixture.detectChanges();
  });

  it('shows loading and empty states', () => {
    expect(fixture.nativeElement.textContent).toContain('Unfolding the atlas');
    locations$.next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No campaign locations have been added yet',
    );
  });

  it('renders a database location and its linked session', () => {
    locations$.next([
      {
        id: 'location-1',
        sourceKey: 'barovia',
        name: 'Barovia',
        description: 'A land in the Mists.',
        visibility: 'party',
        createdAt: '',
        updatedAt: '',
        sessions: [{ id: 'session-1', sessionNumber: 1, sessionName: 'Arrival', startedOn: null }],
      },
    ]);
    fixture.componentInstance.selectedId.set('location-1');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Barovia');
    expect(fixture.nativeElement.textContent).toContain('Session 1');
  });
});
