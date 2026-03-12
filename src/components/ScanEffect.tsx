import { cn } from "@/lib/utils";

interface ScanEffectProps {
  type: "fingerprint" | "face";
  active: boolean;
  className?: string;
}

export function ScanEffect({ type, active, className }: ScanEffectProps) {
  if (!active) return null;

  return (
    <div className={cn("absolute inset-0 overflow-hidden rounded-lg pointer-events-none", className)}>
      <div
        className={cn(
          "absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent",
          type === "fingerprint" ? "animate-fingerprint-scan" : "animate-face-scan"
        )}
      />
      <div className="absolute inset-0 border-2 border-primary/30 rounded-lg animate-pulse-glow" />
    </div>
  );
}
