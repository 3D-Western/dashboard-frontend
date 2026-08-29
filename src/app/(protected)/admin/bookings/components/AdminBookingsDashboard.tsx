'use client';

import { useState } from 'react';
import AdminBookingList from './AdminBookingList';
import BulkActionBar from './BulkActionBar';
import { useAdminBookings, useBulkAction } from '@/hooks/useAdminBookings';
import { BookingStatus } from '@/types/booking';

type TabType = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Conflicts';

export function AdminBookingsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [equipmentId, setEquipmentId] = useState<string>('');

  const queryStatus =
    activeTab === 'All' || activeTab === 'Conflicts'
      ? undefined
      : (activeTab.toUpperCase() as BookingStatus);

  const { bookings, pagination, summary, isLoading, error, refetch } = useAdminBookings({
    status: queryStatus,
    page,
    pageSize,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    equipmentId: equipmentId || undefined,
    hasConflict: activeTab === 'Conflicts' ? true : undefined,
  });

  const { run: runBulkAction, isPending: isBulkPending } = useBulkAction();
  const tabs: TabType[] = ['All', 'Pending', 'Approved', 'Rejected', 'Conflicts'];

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked && bookings) {
      setSelectedIds(bookings.map((b) => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkActionExecute = async (
    action: 'APPROVE' | 'REJECT' | 'CANCEL',
    reason?: string,
  ) => {
    await runBulkAction(selectedIds, action, reason);
    refetch();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setPage(1);
  };

  if (error) {
    return <div className="p-6 text-destructive">Failed to load bookings: {error}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-24">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-semibold text-foreground">{summary?.totalPending ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="text-2xl font-semibold text-foreground">
            {summary?.totalApproved ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Conflicts</p>
          <p className="text-2xl font-semibold text-destructive">
            {summary?.totalConflicts ?? '—'}
          </p>
        </div>
      </div>

      <div className="mb-6 flex space-x-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="mb-6 flex flex-wrap gap-4 rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-muted-foreground">Start Date</label>
          <input
            type="date"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setPage(1);
            }}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-muted-foreground">End Date</label>
          <input
            type="date"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setPage(1);
            }}
            className="rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </div>
        <div className="flex max-w-xs flex-grow flex-col">
          <label className="mb-1 text-xs text-muted-foreground">Equipment</label>
          <input
            type="text"
            placeholder="Search by Equipment ID/Name..."
            value={equipmentId}
            onChange={(e) => {
              setEquipmentId(e.target.value);
              setPage(1);
            }}
            className="w-full rounded border border-input bg-background px-3 py-1.5 text-sm text-foreground"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setStartTime('');
              setEndTime('');
              setEquipmentId('');
              setPage(1);
            }}
            className="py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <AdminBookingList
        bookings={bookings}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
      />

      {/* PAGINATION CONTROLS */}
      <div className="mt-6 flex items-center justify-between border-t border-border p-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Page {page} {pagination?.totalPages ? `of ${pagination.totalPages}` : ''}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="rounded border border-input px-3 py-1 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={
                (pagination?.totalPages
                  ? page >= pagination.totalPages
                  : bookings.length < pageSize) || isLoading
              }
              className="rounded border border-input px-3 py-1 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <BulkActionBar
        selectedIds={selectedIds}
        onBulkAction={handleBulkActionExecute}
        isPending={isBulkPending}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
}
