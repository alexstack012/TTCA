import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CampaignSessionsService } from './campaign-sessions.service';

describe('CampaignSessionsService', () => {
  it('requests the campaign sessions endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(CampaignSessionsService);
    const http = TestBed.inject(HttpTestingController);

    service.getSessions('curse-of-strahd').subscribe((sessions) => expect(sessions).toEqual([]));
    const request = http.expectOne('/api/campaigns/curse-of-strahd/sessions');
    expect(request.request.method).toBe('GET');
    request.flush([]);
    http.verify();
  });
});
