import { CampaignEntityType, CampaignEntityVisibility } from './archive.types';

export interface CampaignLocationSummary {
  id: string;
  sourceKey: string;
  name: string;
  description: string | null;
  visibility: CampaignEntityVisibility;
}

export interface CampaignEntitySummary {
  id: string;
  sourceKey: string;
  name: string;
  entityType: CampaignEntityType;
  visibility: CampaignEntityVisibility;
  description: string | null;
  imageUrl: string | null;
}

export interface CampaignSession {
  id: string;
  sessionNumber: number;
  isMultiDay: boolean;
  sessionName: string;
  visibility: CampaignEntityVisibility;
  description: string;
  startedOn: string | null;
  endedOn: string | null;
  createdAt: string;
  updatedAt: string;
  locations: CampaignLocationSummary[];
  entities: CampaignEntitySummary[];
}

export type CampaignSessionUpdate = Pick<
  CampaignSession,
  | 'sessionNumber'
  | 'isMultiDay'
  | 'sessionName'
  | 'visibility'
  | 'description'
  | 'startedOn'
  | 'endedOn'
>;
