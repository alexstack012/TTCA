import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CampaignLocation, CampaignLocationInput } from '../types/campaign-location.types';

@Injectable({ providedIn: 'root' })
export class CampaignLocationsService {
  private readonly http = inject(HttpClient);

  getLocations(campaignKey: string): Observable<CampaignLocation[]> {
    return this.http.get<CampaignLocation[]>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/locations`,
    );
  }

  createLocation(
    campaignKey: string,
    location: CampaignLocationInput,
  ): Observable<CampaignLocation> {
    return this.http.post<CampaignLocation>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/locations`,
      location,
    );
  }

  updateLocation(
    campaignKey: string,
    locationId: string,
    location: CampaignLocationInput,
  ): Observable<CampaignLocation> {
    return this.http.put<CampaignLocation>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/locations/${encodeURIComponent(locationId)}`,
      location,
    );
  }

  deleteLocation(campaignKey: string, locationId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/campaigns/${encodeURIComponent(campaignKey)}/locations/${encodeURIComponent(locationId)}`,
      { body: { confirmation: 'delete' } },
    );
  }
}
