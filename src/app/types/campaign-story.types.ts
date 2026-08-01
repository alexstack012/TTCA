import { CampaignEntityVisibility, CampaignEntityType } from './archive.types';

export type LoreCategory =
  | 'character'
  | 'deity'
  | 'faction'
  | 'location'
  | 'artifact'
  | 'history'
  | 'event'
  | 'culture'
  | 'magic'
  | 'other';
export type PlotStatus = 'open' | 'in_progress' | 'resolved' | 'abandoned';
export type PlotPriority = 'low' | 'normal' | 'high' | 'critical';
export type PlotSessionRelationship =
  'introduced' | 'mentioned' | 'advanced' | 'complicated' | 'resolved';
export interface StoryEntityLink {
  id?: string;
  entityId: string;
  name?: string;
  entityType?: CampaignEntityType;
  imageUrl?: string | null;
  relationshipLabel: string;
  notes: string;
}
export interface PlotSessionLink {
  id?: string;
  sessionId: string;
  sessionNumber?: number;
  sessionName?: string;
  relationshipType: PlotSessionRelationship;
  notes: string;
}
export interface LoreEntry {
  id: string;
  sourceKey: string;
  title: string;
  summary: string | null;
  content: string;
  category: LoreCategory;
  visibility: CampaignEntityVisibility;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  entities: Array<StoryEntityLink & { id: string; name: string }>;
}
export interface PlotPoint {
  id: string;
  sourceKey: string;
  title: string;
  summary: string | null;
  description: string;
  status: PlotStatus;
  priority: PlotPriority;
  visibility: CampaignEntityVisibility;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  entities: Array<StoryEntityLink & { id: string; name: string }>;
  sessions: Array<PlotSessionLink & { id: string; sessionNumber: number; sessionName: string }>;
}
export interface StoryEntityOption {
  id: string;
  name: string;
  entityType: CampaignEntityType;
}
export interface StorySessionOption {
  id: string;
  sessionNumber: number;
  sessionName: string;
}
export interface StoryOptions {
  entities: StoryEntityOption[];
  sessions: StorySessionOption[];
}
export interface LoreInput {
  title: string;
  summary: string;
  content: string;
  category: LoreCategory;
  visibility: CampaignEntityVisibility;
  isPinned: boolean;
  entityLinks: StoryEntityLink[];
}
export interface PlotPointInput {
  title: string;
  summary: string;
  description: string;
  status: PlotStatus;
  priority: PlotPriority;
  visibility: CampaignEntityVisibility;
  isPinned: boolean;
  entityLinks: StoryEntityLink[];
  sessionLinks: PlotSessionLink[];
}
