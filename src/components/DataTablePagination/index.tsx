'use client';

import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PaginationMetadata } from '@/types/common';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  // Accept either the full PaginationMetadata or a lightweight partial
  // shape (used by some tests) for compatibility.
  pagination: PaginationMetadata | Partial<PaginationMetadata>;
  showSelectionCount?: boolean;
}

export function DataTablePagination<TData>({
  table,
  pagination,
  showSelectionCount = false,
}: DataTablePaginationProps<TData>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = pagination.page ?? 1;
  const totalPages = pagination.totalPages ?? 1;
  const pageSize = pagination.pageSize ?? 10;

  // Update URL search params for pagination
  const updatePagination = useCallback(
    (newPage: number, newPageSize?: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', newPage.toString());
      if (newPageSize !== undefined) {
        params.set('pageSize', newPageSize.toString());
        // Reset to page 1 when changing page size
        params.set('page', '1');
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div
      className={`flex flex-col items-center gap-4 px-2 sm:flex-row ${showSelectionCount ? 'sm:justify-between' : 'sm:justify-end'}`}
    >
      {/* Live region for page change announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Page {currentPage} of {totalPages}
      </div>

      {showSelectionCount && (
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      )}

      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              updatePagination(1, Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium" aria-hidden="true">
            Page {currentPage} of {totalPages}
          </div>
          <nav className="flex items-center gap-1" aria-label="Pagination navigation">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updatePagination(1)}
              disabled={!Boolean(pagination.hasPrevious)}
              aria-label={`Go to first page, currently on page ${currentPage} of ${totalPages}`}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updatePagination(currentPage - 1)}
              disabled={!Boolean(pagination.hasPrevious)}
              aria-label={`Go to previous page, currently on page ${currentPage} of ${totalPages}`}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updatePagination(currentPage + 1)}
              disabled={!Boolean(pagination.hasNext)}
              aria-label={`Go to next page, currently on page ${currentPage} of ${totalPages}`}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => updatePagination(totalPages)}
              disabled={!Boolean(pagination.hasNext)}
              aria-label={`Go to last page, currently on page ${currentPage} of ${totalPages}`}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
}
