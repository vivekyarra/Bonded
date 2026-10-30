/**
 * AUDIT-ONLY DATA. Optional, self-reported demographic groups for caregivers.
 *
 * This table is stored separately and is NEVER imported by matching, scoring or agent
 * code (enforced by a test). It exists only so the fairness audit can prove that shift
 * offers stay balanced across groups.
 */
import { mulberry32 } from "../agency/sunrise";

export const AUDIT_GROUPS = [
  "Hispanic or Latino",
  "White",
  "Black or African American",
  "Asian",
  "American Indian or Alaska Native",
  "Two or more",
  "Prefer not to say",
] as const;
export type AuditGroup = (typeof AUDIT_GROUPS)[number];

export interface AuditDemographic {
  caregiverId: string;
  groupSelfReported: AuditGroup;
}

/** Generated self-reports for the 40 agency caregivers (audit only, never used in matching). */
export function auditDemographics(caregiverIds: string[]): AuditDemographic[] {
  const rand = mulberry32(777);
  const weights = [0.34, 0.3, 0.12, 0.08, 0.04, 0.05, 0.07];
  return caregiverIds.map((caregiverId) => {
    let r = rand();
    let i = 0;
    while (i < weights.length - 1 && r > weights[i]) {
      r -= weights[i];
      i++;
    }
    return { caregiverId, groupSelfReported: AUDIT_GROUPS[i] };
  });
}
