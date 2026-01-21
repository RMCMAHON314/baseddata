// Based Data Logo - Three squares between BASED and DATA

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
        alignItems: 'center',
        gap: '8px',
      }}
    >
      BASED
      <span style={{ display: 'inline-flex', gap: '3px' }}>
        <span style={{ width: '6px', height: '6px', background: '#3366FF', borderRadius: '1px' }} />
        <span style={{ width: '6px', height: '6px', background: '#3366FF', borderRadius: '1px' }} />
        <span style={{ width: '6px', height: '6px', background: '#3366FF', borderRadius: '1px' }} />
      </span>
      DATA
    </span>
  );
}
