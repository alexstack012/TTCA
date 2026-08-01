import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface DashboardSection {
  glyph: string;
  name: string;
  meta: string;
  path: string;
  demoCopy: string;
  playerCopy: string;
  demoAction: string;
  playerAction: string;
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
  readonly isPlayer = computed(() => this.user()?.canEdit === true);

  readonly sections: DashboardSection[] = [
    {
      glyph: 'I',
      name: 'Characters',
      meta: '67 known entities',
      path: '/characters',
      demoCopy:
        'A searchable, database-backed directory of allies, adversaries, factions, and supernatural powers.',
      playerCopy:
        'Friends, fiends, and at least three people who are definitely going to betray us.',
      demoAction: 'View character directory',
      playerAction: 'See who still lives',
    },
    {
      glyph: 'II',
      name: 'Items & Equipment',
      meta: '59 catalogue entries',
      path: '/items',
      demoCopy: 'Structured weapon, armor, ammunition, cost, damage, and equipment reference data.',
      playerCopy: 'Everything we have looted, purchased, borrowed, or quietly forgotten to return.',
      demoAction: 'Browse equipment data',
      playerAction: 'Inspect the spoils',
    },
    {
      glyph: 'III',
      name: 'Spells',
      meta: '71 arcane records',
      path: '/spells',
      demoCopy:
        'A filterable grimoire of spell effects, levels, ranges, scaling, saves, and damage.',
      playerCopy: 'For those delicate moments when diplomacy fails and the room needs more fire.',
      demoAction: 'Explore spell reference',
      playerAction: 'Consult the grimoire',
    },
    {
      glyph: 'IV',
      name: 'Campaign Log',
      meta: 'Session chronicle',
      path: '/campaign-log',
      demoCopy:
        'A chronological account of sessions, discoveries, decisions, and their lasting consequences.',
      playerCopy: 'A mostly reliable account of our finest decisions and most avoidable disasters.',
      demoAction: 'Review session history',
      playerAction: 'Revisit our mistakes',
    },
    {
      glyph: 'V',
      name: 'Lore & Plot Points',
      meta: 'Living knowledge base',
      path: '/lore',
      demoCopy:
        'Connected histories, clues, prophecies, revelations, and unresolved narrative threads.',
      playerCopy:
        'Clues, conspiracies, ominous prophecies, and strings we should have pulled six sessions ago.',
      demoAction: 'Examine narrative data',
      playerAction: 'Follow the red string',
    },
    {
      glyph: 'VI',
      name: 'Locations',
      meta: 'World atlas',
      path: '/locations',
      demoCopy:
        'An organized atlas of domains, settlements, landmarks, ruins, and connected regions.',
      playerCopy:
        'Places we have survived, places we have ruined, and places foolish enough to await us.',
      demoAction: 'Explore location records',
      playerAction: 'Return to the road',
    },
  ];
}
