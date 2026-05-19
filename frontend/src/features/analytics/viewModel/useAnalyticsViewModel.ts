import { useCallback, useEffect, useMemo, useState } from "react";
import { createChatHistoryService } from "@/features/chatHistory/model/services/createChatHistoryService";
import { createImageService } from "@/features/images/model/services/createImageService";
import { createPdfService } from "@/features/pdfs/model/services/createPdfService";
import { createWebPageService } from "@/features/webPages/model/services/createWebPageService";
import type { AnalyticsViewModel, ChartPoint } from "./AnalyticsViewModel";

const DAY_MS = 24 * 60 * 60 * 1000;

export function useAnalyticsViewModel(): AnalyticsViewModel {
  const chatHistoryService = useMemo(() => createChatHistoryService(), []);
  const pdfService = useMemo(() => createPdfService(), []);
  const webPageService = useMemo(() => createWebPageService(), []);
  const imageService = useMemo(() => createImageService(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [totalContentSources, setTotalContentSources] = useState(0);
  const [totalIndexedSections, setTotalIndexedSections] = useState(0);
  const [contentByType, setContentByType] = useState<ChartPoint[]>([]);
  const [activityByDay, setActivityByDay] = useState<ChartPoint[]>([]);
  const [crawlHealth, setCrawlHealth] = useState<ChartPoint[]>([]);
  const [topWebPages, setTopWebPages] = useState<ChartPoint[]>([]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessions, pdfs, webPages, images] = await Promise.all([
        chatHistoryService.listSessions(),
        pdfService.listPdfs(),
        webPageService.listWebPages(),
        imageService.listImages(),
      ]);

      setTotalSessions(sessions.length);
      setTotalMessages(sessions.reduce((sum, session) => sum + session.messageCount, 0));
      setTotalContentSources(pdfs.length + webPages.length + images.length);
      setTotalIndexedSections(webPages.reduce((sum, page) => sum + page.chunksCreated, 0));
      setContentByType([
        { label: "PDFs", value: pdfs.length },
        { label: "Web Pages", value: webPages.length },
        { label: "Images", value: images.length },
      ]);
      setActivityByDay(
        buildLastSevenDays([
          ...sessions.map((session) => session.firstMessageAt),
          ...pdfs.map((pdf) => pdf.createdAt),
          ...webPages.map((page) => page.createdAt),
          ...images.map((image) => image.createdAt),
        ]),
      );
      setCrawlHealth([
        { label: "Fetched", value: webPages.reduce((sum, page) => sum + (page.pagesFetched ?? 0), 0) },
        { label: "Failed", value: webPages.reduce((sum, page) => sum + (page.pagesFailed ?? 0), 0) },
      ]);
      setTopWebPages(
        [...webPages]
          .sort((a, b) => b.chunksCreated - a.chunksCreated)
          .slice(0, 5)
          .map((page) => ({ label: page.title || page.url, value: page.chunksCreated })),
      );

      return { success: true };
    } catch {
      const errorMessage = "Failed to load analytics.";
      setError(errorMessage);
      return { success: false, errorMessage };
    } finally {
      setLoading(false);
    }
  }, [chatHistoryService, imageService, pdfService, webPageService]);

  useEffect(() => {
    void Promise.resolve().then(loadAnalytics);
  }, [loadAnalytics]);

  return {
    loading,
    error,
    totalSessions,
    totalMessages,
    totalContentSources,
    totalIndexedSections,
    contentByType,
    activityByDay,
    crawlHealth,
    topWebPages,
    loadAnalytics,
  };
}

function buildLastSevenDays(dates: string[]): ChartPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, index) => {
    const day = new Date(today.getTime() - (6 - index) * DAY_MS);
    const nextDay = new Date(day.getTime() + DAY_MS);
    const value = dates.filter((date) => {
      const parsed = new Date(date);
      return parsed >= day && parsed < nextDay;
    }).length;

    return {
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      value,
    };
  });
}
