// Based Data Logo - Stacked, right-aligned

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span 
      className={className}
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif",
        fontWeight: 700,
        fontSize: '18px',
        letterSpacing: '-0.02em',
        color: '#3366FF',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        lineHeight: 1.1,
      }}
    >
      <span>based</span>
      <span>data</span>
    </span>
  );
}
