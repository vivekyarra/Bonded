/**
 * Code-level guardrails (spec §8): not just the prompt.
 *  - Bridge Kit text may only mention entities in the pair's bridge list.
 *  - Contacting a person requires approved_by_human === true, which only the UI sets.
 */

const MARK = /\[\[([^\]]+)\]\]/g;

export const normaliseName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export interface GuardResult {
  ok: boolean;
  problems: string[];
}

/**
 * Closed-set validation. Every [[marked]] entity must be an allowed bridge, at least one
 * bridge must be mentioned, and no other known entity name may appear unmarked.
 */
export function validateGroundedText(text: string, allowed: string[], known: string[]): GuardResult {
  const problems: string[] = [];
  const allowedSet = new Set(allowed.map(normaliseName));
  const marked = [...text.matchAll(MARK)].map((m) => m[1]);
  if (!marked.length) problems.push("mentions no bridge");
  for (const m of marked) if (!allowedSet.has(normaliseName(m))) problems.push(`not a bridge: ${m}`);
  const plain = ` ${normaliseName(text.replace(MARK, " "))} `;
  for (const k of known) {
    const n = normaliseName(k);
    if (n.length < 4 || allowedSet.has(n)) continue;
    if (plain.includes(` ${n} `)) problems.push(`unlisted entity: ${k}`);
  }
  return { ok: problems.length === 0, problems };
}

export const stripMarks = (text: string) => text.replace(MARK, "$1");

export class ApprovalRequiredError extends Error {
  constructor(action: string) {
    super(`${action} requires scheduler approval (approved_by_human=true)`);
    this.name = "ApprovalRequiredError";
  }
}

/** Only the UI's approve endpoint passes `true`; the agent's tool schema has no such field. */
export function requireHumanApproval(action: string, approvedByHuman: unknown): void {
  if (approvedByHuman !== true) throw new ApprovalRequiredError(action);
}
