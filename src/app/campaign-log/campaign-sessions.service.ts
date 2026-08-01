import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CampaignSession,
  CampaignSessionInput,
  CampaignSessionOptions,
  CampaignSessionUpdate,
} from '../types/campaign-session.types';

@Injectable({ providedIn: 'root' })
export class CampaignSessionsService {
  private readonly http = inject(HttpClient);

  getSessions(campaignKey: string): Observable<CampaignSession[]> {
    return this.http.get<CampaignSession[]>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/sessions`,
    );
  }

  getOptions(campaignKey: string): Observable<CampaignSessionOptions> {
    return this.http.get<CampaignSessionOptions>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/session-options`,
    );
  }

  createSession(campaignKey: string, session: CampaignSessionInput): Observable<CampaignSession> {
    return this.http.post<CampaignSession>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/sessions`,
      session,
    );
  }

  updateSession(
    campaignKey: string,
    sessionId: string,
    session: CampaignSessionUpdate,
  ): Observable<CampaignSession> {
    return this.http.put<CampaignSession>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/sessions/${encodeURIComponent(sessionId)}`,
      session,
    );
  }

  deleteSession(campaignKey: string, sessionId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/sessions/${encodeURIComponent(sessionId)}`,
      { body: { confirmation: 'delete' } },
    );
  }
}
