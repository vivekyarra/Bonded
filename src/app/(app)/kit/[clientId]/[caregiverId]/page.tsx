"use client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { BridgeKit } from "@/lib/agent/bridgekit";
import { BridgeKitView } from "@/components/BridgeKitView";
import { ErrorState, PageHeader, PhoneFrame, Skeleton } from "@/components/ui";
import { post, useJson } from "@/components/useJson";

export default function KitPage({ params }: { params: { clientId: string; caregiverId: string } }) {
  const kit = useJson<BridgeKit>("/api/bridgekit", post(params));
  return (
    <div>
      <Link href={`/match/${params.clientId}/${params.caregiverId}`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
        <ArrowLeft size={16} /> Match
      </Link>
      <PageHeader title="Bridge Kit" subtitle="What the caregiver sees before the first visit" />
      {kit.loading && (
        <PhoneFrame>
          <div className="space-y-3" role="status" aria-label="Loading">
            <Skeleton className="h-20 rounded-[22px]" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-40 rounded-[20px]" />
          </div>
        </PhoneFrame>
      )}
      {kit.error && <ErrorState error={kit.error} onRetry={kit.reload} />}
      {kit.data && <BridgeKitView kit={kit.data} />}
    </div>
  );
}
