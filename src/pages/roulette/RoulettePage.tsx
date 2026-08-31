import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { RouletteAnalytics } from "./RouletteAnalytics";
import { RouletteConfig } from "./RouletteConfig";
import { RouletteProbability } from "./RouletteProbability";
import { RouletteRounds } from "./RouletteRounds";
import { RouletteAudit } from "./RouletteAudit";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "config", label: "Configuration" },
  { key: "probability", label: "Probability / RTP" },
  { key: "rounds", label: "Rounds" },
  { key: "audit", label: "Audit log" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export const RoulettePage = (): JSX.Element => {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div>
      <PageHeader
        title="Roulette"
        description="Virtual-coin roulette — configuration, scheduled probability policies, rounds and analytics."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map(({ key, label }) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "overview" && <RouletteAnalytics />}
      {tab === "config" && (
        <RouletteConfig onOpenProbability={() => setTab("probability")} />
      )}
      {tab === "probability" && <RouletteProbability />}
      {tab === "rounds" && <RouletteRounds />}
      {tab === "audit" && <RouletteAudit />}
    </div>
  );
};
