import { CampaignEntityVisibility } from './archive.types';

export interface LocationSessionSummary {
  id: string;
  sessionNumber: number;
  sessionName: string;
  startedOn: string | null;
}

export interface CampaignLocation {
  id: string;
  sourceKey: string;
  name: string;
  description: string | null;
  visibility: CampaignEntityVisibility;
  createdAt: string;
  updatedAt: string;
  sessions: LocationSessionSummary[];
}

export interface CampaignLocationInput {
  name: string;
  description: string | null;
  visibility: CampaignEntityVisibility;
}
