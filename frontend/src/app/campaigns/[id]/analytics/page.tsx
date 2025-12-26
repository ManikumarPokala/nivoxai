import { getCampaignAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type Props = {
  params: {
    id: string;
  };
};

export default async function Page({ params }: Props) {
  const campaignId = params.id;

  const { data, error } = await getCampaignAnalytics(campaignId);

  if (error) {
    return (
      <div className="p-6 text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-gray-500">
        Loading campaign analytics…
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Campaign Performance</h1>

      <div className="grid grid-cols-3 gap-4">
        <Metric label="Avg Engagement" value={data.avg_engagement} />
        <Metric label="Avg ROI" value={data.avg_roi} />
        <Metric label="Total KOLs" value={data.total_kols} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
