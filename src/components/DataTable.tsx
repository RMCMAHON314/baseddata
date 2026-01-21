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
  data: Array<{
    company: string;
    sector: string;
    raised: string;
    employees: number;
    founded: number;
  }>;
}

export function DataTable({ data }: DataTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass rounded-xl border border-border/50 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="font-display text-muted-foreground">Company</TableHead>
              <TableHead className="font-display text-muted-foreground">Sector</TableHead>
              <TableHead className="font-display text-muted-foreground">Raised</TableHead>
              <TableHead className="font-display text-muted-foreground">Employees</TableHead>
              <TableHead className="font-display text-muted-foreground">Founded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <motion.tr
                key={row.company}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.4 + index * 0.05 }}
                className="border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <TableCell className="font-medium text-foreground">{row.company}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-electric/10 text-electric border border-electric/20">
                    {row.sector}
                  </span>
                </TableCell>
                <TableCell className="text-electric font-display font-semibold">{row.raised}</TableCell>
                <TableCell className="text-muted-foreground">{row.employees}</TableCell>
                <TableCell className="text-muted-foreground">{row.founded}</TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
