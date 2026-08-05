import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface DashboardSection {
  glyph: string;
  name: string;
  meta: string;
  path: string;
  demoCopy: string;
  editorCopy: string;
  demoAction: string;
  editorAction: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly auth = inject(AuthService);
  readonly user = this.auth.user;
  readonly isEditor = computed(() => this.user()?.canEdit === true);

  readonly sections: DashboardSection[] = [
    {
      glyph: 'I',
      name: 'Characters',
      meta: 'Searchable entity directory',
      path: '/characters',
      demoCopy:
        'A searchable, database-backed directory of allies, adversaries, factions, and supernatural powers.',
      editorCopy:
        'Friends, fiends, and at least three people who are definitely going to betray us.',
      demoAction: 'View character directory',
      editorAction: 'See who still lives',
    },
    {
      glyph: 'II',
      name: 'Items & Equipment',
      meta: 'Structured equipment catalogue',
      path: '/items',
      demoCopy: 'Structured weapon, armor, ammunition, cost, damage, and equipment reference data.',
      editorCopy: 'Everything we have looted, purchased, borrowed, or quietly forgotten to return.',
      demoAction: 'Browse equipment data',
      editorAction: 'Inspect the spoils',
    },
    {
      glyph: 'III',
      name: 'Spells',
      meta: 'Filterable spell reference',
      path: '/spells',
      demoCopy:
        'A filterable grimoire of spell effects, levels, ranges, scaling, saves, and damage.',
      editorCopy: 'For those delicate moments when diplomacy fails and the room needs more fire.',
      demoAction: 'Explore spell reference',
      editorAction: 'Consult the grimoire',
    },
    {
      glyph: 'IV',
      name: 'Campaign Log',
      meta: 'Session chronicle',
      path: '/campaign-log',
      demoCopy:
        'A chronological account of sessions, discoveries, decisions, and their lasting consequences.',
      editorCopy: 'A mostly reliable account of our finest decisions and most avoidable disasters.',
      demoAction: 'Review session history',
      editorAction: 'Revisit our mistakes',
    },
    {
      glyph: 'V',
      name: 'Lore & Plot Points',
      meta: 'Living knowledge base',
      path: '/lore',
      demoCopy:
        'Connected histories, clues, prophecies, revelations, and unresolved narrative threads.',
      editorCopy:
        'Clues, conspiracies, ominous prophecies, and strings we should have pulled six sessions ago.',
      demoAction: 'Examine narrative data',
      editorAction: 'Follow the red string',
    },
    {
      glyph: 'VI',
      name: 'Locations',
      meta: 'World atlas',
      path: '/locations',
      demoCopy:
        'An organized atlas of domains, settlements, landmarks, ruins, and connected regions.',
      editorCopy:
        'Places we have survived, places we have ruined, and places foolish enough to await us.',
      demoAction: 'Explore location records',
      editorAction: 'Return to the road',
    },
  ];
}
