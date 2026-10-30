"use client";
import { ArrowLeft, MessageCircleHeart, Music2, NotebookPen } from "lucide-react";
import Link from "next/link";
import type { BridgeKit } from "@/lib/agent/bridgekit";
import { BridgeKitView } from "@/components/BridgeKitView";
import { ErrorState, PageHeader, PhoneFrame, Skeleton } from "@/components/ui";
import { post, useJson } from "@/components/useJson";

const PARTS = [
  { icon: MessageCircleHeart, title: "Three ways in", body: "Conversation openers built from what they both love." },
  { icon: Music2, title: "A shared playlist", body: "Songs both of them already enjoy, ready to play." },
  { icon: NotebookPen, title: "Something to do together", body: "One activity for the first visit, plus room for notes." },
];

export default function KitPage({ params }: { params: { clientId: string; caregiverId: string } }) {
  const kit = useJson<BridgeKit>("/api/bridgekit", post(params));
  return (
    // Laptops: the explanation on the left and the phone on the right, sized to the window.
    <div className="grid gap-6 lg:h-full lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <div>
        <Link href={`/match/${params.clientId}/${params.caregiverId}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink lg:hidden">
          <ArrowLeft size={16} /> Match
        </Link>
        <PageHeader title="Bridge Kit" subtitle="What the caregiver sees before the first visit" />
        <ul className="hidden max-w-md space-y-2.5 lg:block">
          {PARTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="glass flex gap-3 p-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tealsoft text-teal">
                <Icon size={16} />
              </span>
              <div>
                <p className="text-[14px] font-semibold">{title}</p>
                <p className="text-[13px] text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:w-[340px]">
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
    </div>
  );
}
