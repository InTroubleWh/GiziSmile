"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export function SimulateOfflineButton() {
  const router = useRouter();

  const handleStartSimulation = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("gizismile_simulate_offline", "true");
    }
    router.push("/z-score?simulate=true");
  };

  return (
    <Button
      onClick={handleStartSimulation}
      className="h-10 text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
    >
      <ShieldCheck className="w-4 h-4" />
      Coba Simulasi Mode Offline
    </Button>
  );
}

