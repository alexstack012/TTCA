import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-archive-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './archive-shell.component.html',
  styleUrl: './archive-shell.component.scss',
})
export class ArchiveShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);
  readonly navigation = [
    { path: '/dashboard', label: 'Grand Index', glyph: '◇' },
    { path: '/characters', label: 'Characters', glyph: 'I' },
    { path: '/items', label: 'Items & Equipment', glyph: 'II' },
    { path: '/spells', label: 'Spells', glyph: 'III' },
    { path: '/campaign', label: 'Campaign', glyph: 'IV' },
    { path: '/campaign-log', label: 'Campaign Log', glyph: 'V' },
    { path: '/lore', label: 'Lore & Plot Points', glyph: 'VI' },
    { path: '/locations', label: 'Locations', glyph: 'VII' },
  ];

  closeMenu(): void {
    this.menuOpen.set(false);
  }
  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}
