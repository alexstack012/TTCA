import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { CampaignSession } from '../types/campaign-session.types';
import { CampaignLogComponent } from './campaign-log.component';
import { CampaignSessionsService } from './campaign-sessions.service';

describe('CampaignLogComponent', () => {
  let fixture: ComponentFixture<CampaignLogComponent>;
  let sessions$: Subject<CampaignSession[]>;

  const populatedSession: CampaignSession = {
    id: 'session-1',
    sessionNumber: 1,
    isMultiDay: true,
    sessionName: 'Arrival in Barovia',
    visibility: 'party',
    description: 'The party crossed through the Mists.',
    startedOn: '2026-07-18',
    endedOn: '2026-07-19',
    createdAt: '2026-07-18T00:00:00Z',
    updatedAt: '2026-07-19T00:00:00Z',
    locations: [
      {
        id: 'location-1',
        sourceKey: 'village-of-barovia',
        name: 'Village of Barovia',
        description: 'A village beneath Castle Ravenloft.',
        visibility: 'party',
      },
    ],
    entities: [
      {
        id: 'entity-1',
        sourceKey: 'ireena-kolyana',
        name: 'Ireena Kolyana',
        entityType: 'npc',
        visibility: 'party',
        description: null,
        imageUrl: null,
      },
    ],
  };

  beforeEach(async () => {
    sessions$ = new Subject<CampaignSession[]>();
    await TestBed.configureTestingModule({
      imports: [CampaignLogComponent],
      providers: [
        provideRouter([]),
        {
          provide: CampaignSessionsService,
          useValue: {
            getSessions: () => sessions$,
            getOptions: () => of({ locations: [], entities: [] }),
          },
        },
        { provide: AuthService, useValue: { user: signal({ canEdit: false }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CampaignLogComponent);
    fixture.detectChanges();
  });

  it('shows a loading state while sessions are requested', () => {
    expect(fixture.nativeElement.textContent).toContain('Opening the campaign chronicle');
  });

  it('shows an empty state when the campaign has no sessions', () => {
    sessions$.next([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No campaign sessions have been added yet.',
    );
  });

  it('shows an error state', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    sessions$.error({ status: 500 });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('campaign chronicle could not be opened');
  });

  it('renders session data, then renders linked locations and entities on selection', () => {
    sessions$.next([populatedSession]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Arrival in Barovia');
    expect(fixture.nativeElement.textContent).toContain('Multi-day session');

    fixture.componentInstance.toggleSession('session-1');
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Village of Barovia');
    expect(text).toContain('Ireena Kolyana');
    const collapse = fixture.nativeElement.querySelector(
      'button.record-toggle[aria-expanded="true"]',
    );
    expect(collapse).toBeTruthy();
    expect(collapse.getAttribute('aria-label')).toContain('Collapse details');
    expect(collapse.querySelector('.eye-icon.eye-open')).toBeTruthy();
  });

  it('filters NPC relationship options by name without changing selected IDs', () => {
    const component = fixture.componentInstance;
    component.options.set({
      locations: [],
      entities: [
        populatedSession.entities[0],
        { ...populatedSession.entities[0], id: 'entity-2', name: 'Rudolf van Richten' },
      ],
    });
    component.createDraft.entityIds = ['entity-1'];

    expect(component.filteredEntities('richten').map((entity) => entity.id)).toEqual(['entity-2']);
    expect(component.createDraft.entityIds).toEqual(['entity-1']);
  });

  it('keeps location references closed until requested and provides a close control', () => {
    sessions$.next([populatedSession]);
    fixture.componentInstance.toggleSession('session-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('A village beneath Castle Ravenloft.');
    fixture.componentInstance.toggleLocationReference('session-1', 'location-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('A village beneath Castle Ravenloft.');
    expect(fixture.nativeElement.textContent).toContain('Close details');
    expect(
      fixture.nativeElement.querySelector('a[href="/locations?location=village-of-barovia"]'),
    ).toBeTruthy();
  });
});
