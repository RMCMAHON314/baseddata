import React from 'react';
import {
  Folder, FolderOpen, File, FileText, FileSpreadsheet,
  Building2, Link2, Lightbulb, Server, DollarSign,
  CheckCircle, AlertTriangle, XCircle
} from 'lucide-react';

export const getTypeIcon = (type: string, size = 'w-5 h-5') => {
  const icons: Record<string, React.ReactNode> = {
    folder: <Folder className={`${size} text-amber-500`} />,
    folderOpen: <FolderOpen className={`${size} text-amber-500`} />,
    entity: <Building2 className={`${size} text-primary`} />,
    fact: <FileText className={`${size} text-emerald-500`} />,
    relationship: <Link2 className={`${size} text-purple-500`} />,
    insight: <Lightbulb className={`${size} text-yellow-500`} />,
    source: <Server className={`${size} text-cyan-500`} />,
    record: <FileSpreadsheet className={`${size} text-orange-500`} />,
    contract: <DollarSign className={`${size} text-green-500`} />,
  };
  return icons[type] || <File className={`${size} text-muted-foreground`} />;
};

export const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-3 h-3 text-emerald-500" />;
    case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
    case 'error': return <XCircle className="w-3 h-3 text-rose-500" />;
    default: return null;
  }
};
