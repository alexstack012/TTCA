import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { RecordVisibility } from '../types/archive.types';

interface SectionConfig {
  eyebrow: string;
  title: string;
  description: string;
  noun: string;
  records: { title: string; meta: string; description: string; visibility: RecordVisibility }[];
}

const sections: Record<string, SectionConfig> = {
  characters: {
    eyebrow: 'Dramatis personae',
    title: 'Characters',
    description:
      'Heroes, darklords, allies, enemies, and every soul caught in the war between worlds.',
    noun: 'character',
    records: [
      {
        title: 'Ireena Kolyana',
        meta: 'Ally · Barovia',
        description:
          'A soul pursued through lifetimes, now standing at the edge of a greater darkness.',
        visibility: 'Revealed',
      },
      {
        title: 'The Veiled General',
        meta: 'Unknown · Shadowfell',
        description: 'Commander of an army whose soldiers have surrendered their names.',
        visibility: 'Public',
      },
      {
        title: 'The Whispered Hand',
        meta: 'Faction · Allegiance unknown',
        description: 'A hidden power whose true purpose remains sealed.',
        visibility: 'Chronicler only',
      },
    ],
  },
  items: {
    eyebrow: 'The reliquary',
    title: 'Items & Equipment',
    description:
      'Weapons, armor, tools, treasures, and relics—catalogued with both their power and their price.',
    noun: 'item',
    records: [
      {
        title: 'Blade of the Last Dawn',
        meta: 'Longsword · Very rare',
        description: 'A silvered blade that remembers the first sunrise it ever reflected.',
        visibility: 'Revealed',
      },
      {
        title: 'Vistani Field Kit',
        meta: 'Adventuring gear · 18 gp',
        description: 'Practical provisions for surviving roads that refuse to stay in one world.',
        visibility: 'Public',
      },
      {
        title: 'The Hollow Crown',
        meta: 'Wondrous item · Artifact',
        description: 'Its provenance and properties are restricted by the Chronicler.',
        visibility: 'Chronicler only',
      },
    ],
  },
  spells: {
    eyebrow: 'The black grimoire',
    title: 'Spells',
    description:
      'Arcane formulae, divine invocations, forbidden rites, and magic altered by the Mists.',
    noun: 'spell',
    records: [
      {
        title: 'Lantern Against the Mists',
        meta: '3rd-level abjuration',
        description: 'Carves a brief and perilous road through supernatural fog.',
        visibility: 'Public',
      },
      {
        title: 'Shadow Stitch',
        meta: '2nd-level necromancy',
        description: 'Binds a creature to the shadow it casts.',
        visibility: 'Revealed',
      },
      {
        title: 'Unmake the Door',
        meta: '9th-level transmutation',
        description: 'A formula redacted from every surviving grimoire.',
        visibility: 'Chronicler only',
      },
    ],
  },
};

@Component({
  selector: 'app-section-page',
  standalone: true,
  templateUrl: './section-page.component.html',
  styleUrl: './section-page.component.scss',
})
export class SectionPageComponent {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly section = computed(() => sections[this.route.snapshot.data['section']]);
  readonly visibleRecords = computed(() =>
    this.auth.user()?.canEdit
      ? this.section().records
      : this.section().records.filter((record) => record.visibility !== 'Chronicler only'),
  );
}
