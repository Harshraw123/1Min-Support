interface CharCountProps {
    value: string;
    max: number;
  }
  
  export function CharCount({ value, max }: CharCountProps) {
    // Character usage ko limit ke paas color hint ke saath dikhata hai.
    const len = value.length;
    const pct = len / max;
  
    const color =
      pct >= 1
        ? "text-destructive"
        : pct >= 0.8
        ? "text-amber-500"
        : "text-muted-foreground";
  
    return (
      <p className={`text-right text-[11px] mt-0.5 ${color}`}>
        {len} / {max}
      </p>
    );
  }
