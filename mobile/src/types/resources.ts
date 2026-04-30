export type ResourceType = 'handout' | 'pastQuestion';

export interface ResourceItem {
  id: string;
  code: string;
  title: string;
  level: number;
  faculty: string | null;
  type: ResourceType;
  file_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}
