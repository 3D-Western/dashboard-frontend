'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchFilter } from './SearchFilter';
import { StatusFilter, StatusOption } from './StatusFilter';

const SEARCH_DEBOUNCE_MS = 300;

export interface FilterToolbarProps<T extends string> {
  /** URL parameter the search box writes to */
  searchParam?: string;
  searchPlaceholder: string;
  searchLabel: string;
  statusOptions: StatusOption<T>[];
  statusLabel?: string;
  /** Extra controls at the end of the bar (e.g. a layout switch) */
  trailing?: React.ReactNode;
}

/**
 * Search box + status dropdown for list pages. Filters live in the URL (`?search=…&status=…`) so the
 * server page fetches the matching results and back/forward or a shared link keeps the view.
 * Any filter change goes back to the first page.
 */
export function FilterToolbar<T extends string>({
  searchParam = 'search',
  searchPlaceholder,
  searchLabel,
  statusOptions,
  statusLabel = 'Filter by status',
  trailing,
}: FilterToolbarProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlStatus = searchParams.get('status');
  const currentStatus = statusOptions.some((option) => option.value === urlStatus)
    ? (urlStatus as T)
    : null;
  const urlSearch = searchParams.get(searchParam) ?? '';

  const [search, setSearch] = useState(urlSearch);
  // Keep the box in sync when the URL changes from elsewhere (e.g. a "Clear filters" link)
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      params.delete('page');
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Wait until the user pauses typing instead of fetching on every keystroke
  useEffect(() => {
    if (search === urlSearch) return;
    const timeout = setTimeout(
      () => updateParams({ [searchParam]: search || null }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [search, urlSearch, searchParam, updateParams]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SearchFilter
        id={`${searchParam}-filter`}
        value={search}
        onChange={setSearch}
        placeholder={searchPlaceholder}
        label={searchLabel}
      />
      {/* Phones: dropdown and extras share a row under the search box */}
      <div className="flex items-center gap-3 sm:contents">
        <StatusFilter
          value={currentStatus}
          onChange={(status) => updateParams({ status })}
          options={statusOptions}
          label={statusLabel}
        />
        {trailing && <div className="shrink-0 sm:ml-auto">{trailing}</div>}
      </div>
    </div>
  );
}
