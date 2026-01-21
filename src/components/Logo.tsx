// Based Data Logo - Three dots between based and data

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span 
      className={className}
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif",
        fontWeight: 700,
        fontSize: '22px',
        letterSpacing: '-0.02em',
        color: '#3366FF',
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '6px',
      }}
    >
      based
      <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'baseline' }}>
        <span style={{ width: '4px', height: '4px', background: '#3366FF', borderRadius: '50%' }} />
        <span style={{ width: '4px', height: '4px', background: '#3366FF', borderRadius: '50%' }} />
        <span style={{ width: '4px', height: '4px', background: '#3366FF', borderRadius: '50%' }} />
      </span>
      data
    </span>
  );
}
