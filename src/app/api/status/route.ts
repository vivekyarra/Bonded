import { env, hasClaude, isFixtureMode } from "@/lib/env";
import { qlooConfigured } from "@/lib/qloo/client";
import { cacheStats } from "@/lib/qloo/cache";
import { json } from "@/lib/service/http";

export const dynamic = "force-dynamic";

export function GET() {
  return json({
    qloo: { configured: qlooConfigured(), mode: isFixtureMode() ? "fixture" : "live", baseUrl: env.qlooBaseUrl },
    claude: { configured: hasClaude(), model: env.claudeModel },
    cache: cacheStats(),
  });
}
