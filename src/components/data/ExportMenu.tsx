// Reusable Export Menu dropdown for data tables
import { Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useExport } from '@/hooks/useExportData';

interface ExportMenuProps {
  data: Record<string, unknown>[];
  filename: string;
  disabled?: boolean;
}

export function ExportMenu({ data, filename, disabled }: ExportMenuProps) {
  const { exportToCSV, exportToJSON, exportToXLSX } = useExport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !data?.length} className="gap-1.5">
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToCSV(data, filename)}>
          <FileText className="mr-2 h-4 w-4" /> CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToXLSX(data, filename)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (XLSX)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToJSON(data, filename)}>
          <FileJson className="mr-2 h-4 w-4" /> JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
