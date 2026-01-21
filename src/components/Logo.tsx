// Based Data Logo - Just confident blue text, nothing else

interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <span 
      className={className}
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif",
        fontWeight: 700,
        fontSize: '22px',
        letterSpacing: '-0.02em',
        color: '#3366FF',
      }}
    >
      BASED DATA
    </span>
  );
}
