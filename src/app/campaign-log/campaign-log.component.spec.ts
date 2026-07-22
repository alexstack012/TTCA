import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
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
        description: 'A bleak village.',
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
        { provide: CampaignSessionsService, useValue: { getSessions: () => sessions$ } },
        { provide: AuthService, useValue: { user: signal({ canEdit: false }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CampaignLogComponent);
    fixture.detectChanges();
  });

  it('shows a loading state while sessions are requested', () => {
    expect(fixture.nativeElement.textContent).toContain('Opening the campaign chronicle');
  });

  it('shows an empty state without restoring placeholder sessions', () => {
    sessions$.next([]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No campaign sessions have been added yet.');
    expect(text).not.toContain('Through the Black Gate');
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
  });
});
