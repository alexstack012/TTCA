import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SplashComponent } from './splash/splash.component';
import { ArchiveShellComponent } from './layout/archive-shell.component';
import { SectionPageComponent } from './section-page/section-page.component';
import { CharactersPageComponent } from './characters/characters-page.component';
import { SpellsPageComponent } from './spells/spells-page.component';
import { EquipmentPageComponent } from './equipment/equipment-page.component';
import { CampaignLogComponent } from './campaign-log/campaign-log.component';

export const routes: Routes = [
  { path: '', component: SplashComponent },
  {
    path: '',
    component: ArchiveShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'characters', component: CharactersPageComponent },
      { path: 'items', component: EquipmentPageComponent },
      { path: 'spells', component: SpellsPageComponent },
      { path: 'campaign', component: SectionPageComponent, data: { section: 'campaign' } },
      { path: 'campaign-log', component: CampaignLogComponent },
      { path: 'lore', component: SectionPageComponent, data: { section: 'lore' } },
      { path: 'locations', component: SectionPageComponent, data: { section: 'locations' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
