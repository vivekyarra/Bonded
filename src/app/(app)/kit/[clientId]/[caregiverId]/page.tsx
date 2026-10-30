"use client";
import Link from "next/link";
import type { BridgeKit } from "@/lib/agent/bridgekit";
import { BridgeKitView } from "@/components/BridgeKitView";
import { ErrorState, PageHeader, Spinner } from "@/components/ui";
import { post, useJson } from "@/components/useJson";

export default function KitPage({ params }: { params: { clientId: string; caregiverId: string } }) {
  const kit = useJson<BridgeKit>("/api/bridgekit", post(params));
  return (
    <div>
      <Link href={`/match/${params.clientId}/${params.caregiverId}`} className="text-sm text-muted hover:text-ink">
        ← Match detail
      </Link>
      <PageHeader eyebrow="Caregiver's phone, before the first visit" title="Bridge Kit">
        Conversation openers, a shared playlist and something to do together, all grounded in Qloo bridges.
      </PageHeader>
      {kit.loading && <Spinner label="Building the Bridge Kit…" />}
      {kit.error && <ErrorState error={kit.error} onRetry={kit.reload} />}
      {kit.data && <BridgeKitView kit={kit.data} />}
    </div>
  );
}
