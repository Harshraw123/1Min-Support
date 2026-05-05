"use client";

import React from "react";
import {
  Search,
  Filter,
  ExternalLink,
  Trash2,
  Globe,
  FileText,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type KnowledgeSourceRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  source_url: string | null;
  created_at: string | null;
};

interface KnowledgeTableProps {
  sources: KnowledgeSourceRow[];
  isLoading: boolean;
  onOpenDetails?: (source: KnowledgeSourceRow) => void;
}

const KnowledgeTable = ({ sources, isLoading, onOpenDetails }: KnowledgeTableProps) => {
  return (
    <Card className="bg-card border-border shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base font-semibold">
            Sources
          </CardTitle>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9 w-full sm:w-[220px] md:w-[320px]"
                placeholder="Search sources ..."
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-border bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground pl-6">
                  Name
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                  Type
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
                  Last Updated
                </TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wide font-semibold text-muted-foreground pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-[180px]" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end">
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                sources.map((source) => (
                  <TableRow
                    key={source.id}
                    className="border-border hover:bg-muted/30"
                  >
                    <TableCell className="font-medium pl-6 py-4">
                      <div className="flex items-center gap-2">
                        {source.type === "website" ? (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="max-w-[240px] md:max-w-[360px] truncate">
                          {source.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="capitalize font-medium"
                      >
                        {source.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm capitalize text-emerald-600">
                          {source.status}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {source.created_at
                        ? new Date(source.created_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onOpenDetails?.(source)}
                          aria-label="View source details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default KnowledgeTable;

