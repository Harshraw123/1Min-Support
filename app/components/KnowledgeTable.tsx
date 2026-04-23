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
}

const KnowledgeTable = ({ sources, isLoading }: KnowledgeTableProps) => {
  return (
    <Card className="bg-white border-zinc-200/70 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Sources
          </CardTitle>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                className="pl-9 h-9 w-full sm:w-[220px] md:w-[320px] bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-violet-500/30"
                placeholder="Search sources ..."
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-zinc-200/70 bg-zinc-50/60">
              <TableRow className="hover:bg-transparent border-zinc-200/70">
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-zinc-500 pl-6">
                  Name
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-zinc-500">
                  Type
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-zinc-500">
                  Status
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wide font-semibold text-zinc-500">
                  Last Updated
                </TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-wide font-semibold text-zinc-500 pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-zinc-200/70">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full bg-zinc-200" />
                        <Skeleton className="h-4 w-[180px] bg-zinc-200" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 bg-zinc-200" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 bg-zinc-200" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24 bg-zinc-200" />
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end">
                        <Skeleton className="h-8 w-8 rounded-md bg-zinc-200" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                sources.map((source) => (
                  <TableRow
                    key={source.id}
                    className="border-zinc-200/70 hover:bg-zinc-50"
                  >
                    <TableCell className="text-zinc-900 font-medium pl-6 py-4">
                      <div className="flex items-center gap-2">
                        {source.type === "website" ? (
                          <Globe className="h-4 w-4 text-zinc-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-zinc-500" />
                        )}
                        <span className="max-w-[240px] md:max-w-[360px] truncate">
                          {source.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="capitalize font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-100"
                      >
                        {source.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-emerald-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm capitalize">{source.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-600 text-sm">
                      {source.created_at
                        ? new Date(source.created_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-600 hover:text-destructive hover:bg-zinc-100"
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

