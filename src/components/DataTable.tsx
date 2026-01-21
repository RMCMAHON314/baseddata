import { motion } from "framer-motion";
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
  if (!data || data.length === 0) {
    return (
      <div className="glass rounded-xl border border-white/10 p-8 text-center">
        <p className="text-white/50 lowercase">no data available</p>
      </div>
    );
  }

  const headers = Object.keys(data[0]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass rounded-xl border border-white/10 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              {headers.map((header) => (
                <TableHead key={header} className="font-display text-white/50 lowercase">
                  {header.replace(/_/g, " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <motion.tr
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.4 + index * 0.03 }}
                className="border-white/10 hover:bg-white/5 transition-colors"
              >
                {headers.map((header, cellIndex) => (
                  <TableCell key={header} className={cellIndex === 0 ? "font-medium text-white" : "text-white/70"}>
                    {typeof row[header] === "string" && row[header].startsWith("$") ? (
                      <span className="text-electric font-display font-semibold">{row[header]}</span>
                    ) : header === "sector" || header === "category" || header === "source_type" || header === "type" ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-electric/10 text-electric border border-electric/20 lowercase">
                        {row[header]}
                      </span>
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
    </motion.div>
  );
}
