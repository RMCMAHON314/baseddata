// Based Data - Universal Formatting Utilities

/**
 * Format a number as currency with smart abbreviations
 * $1,234.56 -> $1.23K
 * $1,234,567 -> $1.23M
 * $1,234,567,890 -> $1.23B
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '$0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  }
  if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  }
  if (absValue >= 1e3) {
    return `${sign}$${(absValue / 1e3).toFixed(1)}K`;
  }
  
  return `${sign}$${absValue.toFixed(2)}`;
}

/**
 * Format a number with compact notation
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1e9) return `${sign}${(absValue / 1e9).toFixed(1)}B`;
  if (absValue >= 1e6) return `${sign}${(absValue / 1e6).toFixed(1)}M`;
  if (absValue >= 1e3) return `${sign}${(absValue / 1e3).toFixed(1)}K`;
  
  return `${sign}${absValue.toLocaleString()}`;
}

/**
 * Format a date relative to now
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return 'Unknown';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Unknown';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  
  return d.toLocaleDateString();
}

/**
 * Format percentage with proper bounds
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${Math.min(100, Math.max(0, Math.round(value)))}%`;
}

/**
 * Get a color class based on score
 */
export function getScoreColor(score: number | null | undefined, inverted = false): string {
  if (score === null || score === undefined) return 'text-muted-foreground';
  
  if (inverted) {
    if (score >= 70) return 'text-destructive';
    if (score >= 40) return 'text-warning';
    return 'text-success';
  }
  
  if (score >= 70) return 'text-success';
  if (score >= 40) return 'text-warning';
  return 'text-destructive';
}

/**
 * Get background color class based on score
 */
export function getScoreBgColor(score: number | null | undefined, inverted = false): string {
  if (score === null || score === undefined) return 'bg-muted';
  
  if (inverted) {
    if (score >= 70) return 'bg-destructive/10 border-destructive/30';
    if (score >= 40) return 'bg-warning/10 border-warning/30';
    return 'bg-success/10 border-success/30';
  }
  
  if (score >= 70) return 'bg-success/10 border-success/30';
  if (score >= 40) return 'bg-warning/10 border-warning/30';
  return 'bg-destructive/10 border-destructive/30';
}
