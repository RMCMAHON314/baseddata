import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps {
  data: any[];
}

export function DataTable({ data }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!data || data.length === 0) {
    return (
      <div className="bg-background rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const headers = Object.keys(data[0]);

  const filteredData = searchQuery
    ? data.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : data;

  return (
    <div>
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-primary bg-background w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-secondary transition-colors">
            <ArrowUpDown className="w-4 h-4" />
            Sort
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredData.length} of {data.length}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent bg-card">
              {headers.map((header) => (
                <TableHead key={header} className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {header.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="border-border hover:bg-card transition-colors"
              >
                {headers.map((header, cellIndex) => (
                  <TableCell key={header} className={cellIndex === 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {typeof row[header] === "string" && row[header].startsWith("$") ? (
                      <span className="text-success font-semibold">{row[header]}</span>
                    ) : header === "sector" || header === "category" || header === "source_type" || header === "type" ? (
                      <span className="px-2.5 py-1 rounded-full text-xs bg-accent text-accent-foreground">
                        {row[header]}
                      </span>
                    ) : typeof row[header] === "string" && row[header].startsWith("+") ? (
                      <span className="text-success font-medium">{row[header]}</span>
                    ) : (
                      String(row[header])
                    )}
                  </TableCell>
                ))}
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Previous</button>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 rounded text-sm font-medium text-primary-foreground bg-primary">1</button>
          <button className="w-8 h-8 rounded text-sm font-medium text-muted-foreground hover:bg-secondary">2</button>
          <button className="w-8 h-8 rounded text-sm font-medium text-muted-foreground hover:bg-secondary">3</button>
        </div>
        <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">Next →</button>
      </div>
    </div>
  );
}
