import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LoreEntry,
  LoreInput,
  PlotPoint,
  PlotPointInput,
  StoryOptions,
} from '../types/campaign-story.types';

@Injectable({ providedIn: 'root' })
export class CampaignStoryService {
  private readonly http = inject(HttpClient);
  private root(key: string) {
    return `/api/campaigns/${encodeURIComponent(key)}`;
  }
  getLore(key: string): Observable<LoreEntry[]> {
    return this.http.get<LoreEntry[]>(`${this.root(key)}/lore`);
  }
  getPlotPoints(key: string): Observable<PlotPoint[]> {
    return this.http.get<PlotPoint[]>(`${this.root(key)}/plot-points`);
  }
  getOptions(key: string): Observable<StoryOptions> {
    return this.http.get<StoryOptions>(`${this.root(key)}/story-options`);
  }
  createLore(key: string, value: LoreInput): Observable<LoreEntry> {
    return this.http.post<LoreEntry>(`${this.root(key)}/lore`, value);
  }
  updateLore(key: string, id: string, value: LoreInput): Observable<LoreEntry> {
    return this.http.put<LoreEntry>(`${this.root(key)}/lore/${encodeURIComponent(id)}`, value);
  }
  createPlotPoint(key: string, value: PlotPointInput): Observable<PlotPoint> {
    return this.http.post<PlotPoint>(`${this.root(key)}/plot-points`, value);
  }
  updatePlotPoint(key: string, id: string, value: PlotPointInput): Observable<PlotPoint> {
    return this.http.put<PlotPoint>(
      `${this.root(key)}/plot-points/${encodeURIComponent(id)}`,
      value,
    );
  }
  deleteRecord(key: string, type: 'lore' | 'plot-points', id: string): Observable<void> {
    return this.http.delete<void>(`${this.root(key)}/${type}/${encodeURIComponent(id)}`, {
      body: { confirmation: 'delete' },
    });
  }
}
