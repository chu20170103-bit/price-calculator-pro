interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div className={`stat-card ${highlight ? 'bg-accent/20 border border-accent/30' : ''}`}>
      <div className={`stat-value ${highlight ? 'text-accent' : ''}`}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
