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

type KnowledgeRow = {
  id: string;
  title: string;
  type: "website" | "text" | "upload" | string;
  status: string;
  source_url: string | null;
  created_at: string | null;
};

interface KnowledgeTableProps {
  sources: KnowledgeRow[];
  isLoading: boolean;
}

const KnowledgeTable = ({ sources, isLoading }: KnowledgeTableProps) => {
  return (
    <Card className="bg-[#09090b] border-white/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base font-medium text-white">
            Sources
          </CardTitle>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                className="pl-9 h-9 w-full sm:w-[220px] md:w-[320px] bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-white/20"
                placeholder="Search sources ..."
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-white/10">
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-[11px] uppercase font-bold text-zinc-500 pl-6">
                  Name
                </TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-zinc-500">
                  Type
                </TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-zinc-500">
                  Status
                </TableHead>
                <TableHead className="text-[11px] uppercase font-bold text-zinc-500">
                  Last Updated
                </TableHead>
                <TableHead className="text-right text-[11px] uppercase font-bold text-zinc-500 pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/10">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full bg-white/10" />
                        <Skeleton className="h-4 w-[180px] bg-white/10" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 bg-white/10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20 bg-white/10" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24 bg-white/10" />
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex justify-end">
                        <Skeleton className="h-8 w-8 rounded-md bg-white/10" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                sources.map((source) => (
                  <TableRow
                    key={source.id}
                    className="border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="text-white font-medium pl-6 py-4">
                      <div className="flex items-center gap-2">
                        {source.type === "website" ? (
                          <Globe className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <FileText className="h-4 w-4 text-zinc-400" />
                        )}
                        <span className="max-w-[240px] md:max-w-[360px] truncate">
                          {source.title}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-zinc-400 border-white/10 capitalize font-normal"
                      >
                        {source.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-green-500">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="text-sm">{source.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">
                      {source.created_at
                        ? new Date(source.created_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-400 hover:text-destructive"
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

