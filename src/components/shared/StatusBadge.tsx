import { Badge } from "@/components/ui/badge";
import type { CampaignStatus, ClaimStatus } from "@/types/domain";

const campaignVariants: Record<CampaignStatus, "secondary" | "success" | "warning" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "success",
  PAUSED: "warning",
  ENDED: "outline",
};

const claimVariants: Record<ClaimStatus, "warning" | "success" | "destructive"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
};

export const CampaignStatusBadge = ({ status }: { status: CampaignStatus }): JSX.Element => (
  <Badge variant={campaignVariants[status]}>{status}</Badge>
);

export const ClaimStatusBadge = ({ status }: { status: ClaimStatus }): JSX.Element => (
  <Badge variant={claimVariants[status]}>{status}</Badge>
);
