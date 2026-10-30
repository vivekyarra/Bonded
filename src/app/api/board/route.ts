import { boardView } from "@/lib/service/views";
import { json } from "@/lib/service/http";

export const dynamic = "force-dynamic";

export function GET() {
  return json(boardView());
}
