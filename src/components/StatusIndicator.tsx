import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "online" | "offline" | "warning" | "scanning";
  label?: string;
}

const statusColors = {
  online: "bg-neon-green",
  offline: "bg-destructive",
  warning: "bg-accent",
  scanning: "bg-primary animate-pulse-glow",
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", statusColors[status])} />
      {label && <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  );
}
