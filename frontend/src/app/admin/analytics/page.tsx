import AnalyticsSummaryView from "@/components/AnalyticsSummaryView";
import { getAnalyticsSummary } from "@/lib/analytics";

export default async function AdminAnalyticsPage() {
  const { data, error } = await getAnalyticsSummary();

  return <AnalyticsSummaryView summary={data} error={error} />;
}
