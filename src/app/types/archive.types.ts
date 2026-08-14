export interface CampaignEntity {
  id: string;
  sourceKey: string;
  name: string;
  entityType: CampaignEntityType;
  visibility: CampaignEntityVisibility;
  imageUrl: string | null;
  description: string | null;
  aliases: string[];
  sectionEntries: EntitySectionEntry[];
}

export type CampaignEntityType =
  'npc' | 'creature' | 'deity' | 'artifact' | 'group' | 'supernatural_entity';

export type CampaignEntityVisibility = 'public' | 'party' | 'dm_only';

export interface EntitySectionEntry {
  id: string;
  sectionId: string;
  sectionName: string;
  sectionOrder: number;
  details: EntityDetails;
  status: string;
  context: EntityContext | null;
  newSectionName?: string;
}

export interface EntityContext {
  type: EntityContextType;
  value: string;
}

export type EntityContextType = 'firstMeeting' | 'firstAppearance' | 'connection';

export interface EntityDetails {
  type: EntityDetailsType;
  value: string;
}

export type EntityDetailsType = 'notableEvents' | 'notableInformation' | 'relevance';

export interface CreateCampaignEntityRequest {
  name: string;
  entityType: CampaignEntityType;
  visibility: CampaignEntityVisibility;
  imageUrl?: string | null;
  description?: string | null;
  aliases: string[];
  sectionId: string;
  newSectionName?: string;
  details: EntityDetails;
  status: string;
  context: EntityContext | null;
}

export type RecordVisibility = 'Public' | 'Revealed' | 'Chronicler only';

export interface ArchiveRecordSummary {
  id: string;
  title: string;
  description: string;
  visibility: RecordVisibility;
  image?: string | null;
}
