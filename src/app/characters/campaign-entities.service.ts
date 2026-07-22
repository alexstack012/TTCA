import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CampaignEntity, CreateCampaignEntityRequest } from '../types/archive.types';

@Injectable({ providedIn: 'root' })
export class CampaignEntitiesService {
  private readonly http = inject(HttpClient);

  getEntities(campaignKey: string): Observable<CampaignEntity[]> {
    return this.http.get<CampaignEntity[]>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/entities`,
    );
  }

  updateEntity(campaignKey: string, entity: CampaignEntity): Observable<CampaignEntity> {
    return this.http.put<CampaignEntity>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/entities/${encodeURIComponent(entity.id)}`,
      entity,
    );
  }

  createEntity(
    campaignKey: string,
    entity: CreateCampaignEntityRequest,
  ): Observable<CampaignEntity> {
    return this.http.post<CampaignEntity>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/entities`,
      entity,
    );
  }

  deleteEntity(campaignKey: string, entityId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/entities/${encodeURIComponent(entityId)}`,
      { body: { confirmation: 'delete' } },
    );
  }
}
