"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Section {
  id: string;
  name: string;
  description: string;
  tone: string;
  status: string;
  createdAt: string;
}

const formatDate = (date?: string) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "—";
  }
};

const StatusCell = ({ status }: { status?: string }) => {
  const isActive = (status || "active") === "active";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${
          isActive ? "bg-emerald-500" : "bg-muted-foreground"
        }`}
      />
      <span
        className={`text-sm capitalize ${
          isActive
            ? "text-emerald-600 font-medium"
            : "text-muted-foreground"
        }`}
      >
        {status || "active"}
      </span>
    </div>
  );
};

const SectionTable = ({
  data,
  isLoading = false,
  onEdit,
  onDelete,
}: {
  data: Section[];
  isLoading?: boolean;
  onEdit?: (section: Section) => void;
  onDelete?: (section: Section) => void;
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader className="border-border bg-muted/30">
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="pl-6 w-[220px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Section Name
            </TableHead>
            <TableHead className="w-[260px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </TableHead>
            <TableHead className="w-[100px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tone
            </TableHead>
            <TableHead className="w-[100px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </TableHead>
            <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Created
            </TableHead>
            <TableHead className="pr-6 w-[96px] text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="pl-6 py-4">
                  <Skeleton className="h-4 w-[140px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[200px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-[72px] rounded-full" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                    <Skeleton className="h-4 w-[52px]" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[72px]" />
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex justify-end gap-1">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No sections found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((section) => (
              <TableRow
                key={section.id}
                className="border-border hover:bg-muted/30"
              >
                <TableCell className="pl-6 py-4">
                  <span
                    className="block max-w-[200px] truncate font-medium"
                    title={section.name}
                  >
                    {section.name}
                  </span>
                </TableCell>

                <TableCell>
                  <span
                    className="block max-w-[240px] truncate text-sm text-muted-foreground"
                    title={section.description}
                  >
                    {section.description}
                  </span>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="secondary"
                    className="font-medium capitalize"
                  >
                    {section.tone}
                  </Badge>
                </TableCell>

                <TableCell>
                  <StatusCell status={section.status} />
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(section.createdAt)}
                </TableCell>

                <TableCell className="pr-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit?.(section)}
                      aria-label="Edit section"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete?.(section)}
                      aria-label="Delete section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SectionTable;