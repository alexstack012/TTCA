import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { PlotPoint } from '../types/campaign-story.types';
import { CampaignStoryService } from './campaign-story.service';
import { LorePageComponent } from './lore-page.component';

describe('LorePageComponent', () => {
  let fixture: ComponentFixture<LorePageComponent>;

  const plot: PlotPoint = {
    id: 'plot-1',
    sourceKey: 'missing-relic',
    title: 'The missing relic',
    summary: 'The trail has gone cold.',
    description: 'Find the relic before the next full moon.',
    status: 'open',
    priority: 'high',
    visibility: 'party',
    isPinned: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    entities: [],
    sessions: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LorePageComponent],
      providers: [
        {
          provide: CampaignStoryService,
          useValue: {
            getLore: () => of([]),
            getPlotPoints: () => of([plot]),
            getOptions: () =>
              of({
                entities: [
                  { id: 'entity-1', name: 'Strahd von Zarovich', entityType: 'npc' },
                  { id: 'entity-2', name: 'The Morninglord', entityType: 'deity' },
                  { id: 'entity-3', name: 'Sunsword', entityType: 'artifact' },
                ],
                sessions: [],
              }),
          },
        },
        { provide: AuthService, useValue: { user: signal({ canEdit: true }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LorePageComponent);
    fixture.detectChanges();
  });

  it('scrolls to and focuses the form when a plot point is edited', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    fixture.componentInstance.editPlot(plot);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));

    const title = fixture.nativeElement.querySelector(
      'input[name="plotTitle"]',
    ) as HTMLInputElement;
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(title.value).toBe(plot.title);
    expect(document.activeElement).toBe(title);
  });

  it('searches and filters related entities without clearing hidden selections', () => {
    const component = fixture.componentInstance;
    component.openCreate();
    component.plotDraft.entityLinks = [
      { entityId: 'entity-2', relationshipLabel: 'Patron', notes: '' },
    ];

    component.entitySearch.set('sword');
    component.entityTypeFilter.set('artifact');
    fixture.detectChanges();

    expect(component.filteredEntityOptions().map((entity) => entity.id)).toEqual(['entity-3']);
    expect(component.plotDraft.entityLinks.map((link) => link.entityId)).toEqual(['entity-2']);
    expect(fixture.nativeElement.textContent).toContain('1 matches');
    expect(fixture.nativeElement.textContent).toContain('1 selected');
    expect(
      fixture.nativeElement.querySelector('input[placeholder="Search by name or type"]'),
    ).toBeTruthy();

    component.setTab('lore');
    component.openCreate();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[name="loreTitle"]')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('input[placeholder="Search by name or type"]'),
    ).toBeTruthy();
    expect(component.entitySearch()).toBe('');
    expect(component.entityTypeFilter()).toBe('all');
  });
});
