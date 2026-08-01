import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CampaignLocationsService } from './campaign-locations.service';

describe('CampaignLocationsService', () => {
  it('requests the campaign locations endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(CampaignLocationsService);
    const http = TestBed.inject(HttpTestingController);
    service.getLocations('curse-of-strahd').subscribe((locations) => expect(locations).toEqual([]));
    const request = http.expectOne('/api/campaigns/curse-of-strahd/locations');
    expect(request.request.method).toBe('GET');
    request.flush([]);
    http.verify();
  });
});
