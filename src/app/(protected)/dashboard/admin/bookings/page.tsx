'use client';

import { useState } from 'react';
import AdminBookingList from '@/components/Booking/Admin/AdminBookingList';
import BulkActionBar from '@/components/Booking/Admin/BulkActionBar';
import { useAdminBookings, useBulkAction } from '@/hooks/useAdminBookings'; 
import { BookingStatus } from '@/types/booking';

type TabType = 'All' | 'Pending' | 'Approved' | 'Rejected' | 'Conflicts';

export default function AdminBookingsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [equipmentId, setEquipmentId] = useState<string>('');

  const queryStatus = activeTab === 'All' || activeTab === 'Conflicts' 
    ? undefined 
    : (activeTab.toUpperCase() as BookingStatus);

  const { bookings, pagination, isLoading, error, refetch } = useAdminBookings({ 
    status: queryStatus,
    page,
    pageSize,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    equipmentId: equipmentId || undefined
  });
  
  const { run: runBulkAction, isPending: isBulkPending } = useBulkAction();
  const tabs: TabType[] = ['All', 'Pending', 'Approved', 'Rejected', 'Conflicts'];

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked && bookings) {
      setSelectedIds(bookings.map(b => b.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkActionExecute = async (action: 'APPROVE' | 'REJECT' | 'CANCEL', reason?: string) => {
    await runBulkAction(selectedIds, action, reason);
    refetch();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedIds([]); 
    setPage(1); 
  };

  if (error) {
    return <div className="p-6 text-red-600">Failed to load bookings: {error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Equipment Bookings</h1>
        <p className="text-gray-600">Manage all facility reservations and scheduling conflicts.</p>
      </div>

      <div className="flex space-x-1 border-b mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Start Date</label>
          <input 
            type="date" 
            value={startTime} 
            onChange={(e) => { setStartTime(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">End Date</label>
          <input 
            type="date" 
            value={endTime} 
            onChange={(e) => { setEndTime(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col flex-grow max-w-xs">
          <label className="text-xs text-gray-500 mb-1">Equipment</label>
          <input 
            type="text" 
            placeholder="Search by Equipment ID/Name..."
            value={equipmentId} 
            onChange={(e) => { setEquipmentId(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full"
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={() => { setStartTime(''); setEndTime(''); setEquipmentId(''); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-800 py-1.5"
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
      <div className="flex justify-between items-center mt-6 p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Rows per page:</span>
          <select 
            value={pageSize} 
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            Page {page} {pagination?.totalPages ? `of ${pagination.totalPages}` : ''}
          </span>
          <div className="flex space-x-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={(pagination?.totalPages ? page >= pagination.totalPages : bookings.length < pageSize) || isLoading}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
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