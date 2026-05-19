export interface ChartPoint {
  label: string;
  value: number;
}

export interface AnalyticsViewModel {
  loading: boolean;
  error: string | null;
  totalSessions: number;
  totalMessages: number;
  totalContentSources: number;
  totalIndexedSections: number;
  contentByType: ChartPoint[];
  activityByDay: ChartPoint[];
  crawlHealth: ChartPoint[];
  topWebPages: ChartPoint[];
  loadAnalytics(): Promise<{ success: boolean; errorMessage?: string }>;
}
