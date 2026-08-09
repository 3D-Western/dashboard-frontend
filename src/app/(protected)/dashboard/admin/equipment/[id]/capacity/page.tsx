'use client';

import { useState, useEffect, use } from 'react';
import CapacityGauge from '@/components/Booking/Admin/CapacityGauge';
import { CapacitySettings } from '@/types/booking';

// IMPORT API TOOLS:
import { apiRequest } from '@/api/client/base';
import { endpoints } from '@/api/client/endpoints';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function CapacityManagementPage({ params }: PageProps) {
  const { id: equipmentId } = use(params);

  const [settings, setSettings] = useState<CapacitySettings | null>(null);
  const [currentUtilization, setCurrentUtilization] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const url = endpoints.bookings.adminRestrictions(equipmentId);
        const response = await apiRequest<{ data?: CapacitySettings }>(url, { method: 'GET' });

        const data = response.data ?? (response as unknown as CapacitySettings);

        setSettings({
          equipmentId,
          maxSimultaneousBookings: data.maxSimultaneousBookings ?? 1,
          requireAdminApproval: data.requireAdminApproval ?? true,
          allowWaitlist: data.allowWaitlist ?? true,
          restrictions: {
            requiresTraining: data.restrictions?.requiresTraining ?? false,
          },
        });

        // Restore the visual gauge mock data so it isn't an empty grey bar!
        setCurrentUtilization(1);
      } catch (error) {
        console.error('Failed to fetch equipment settings:', error);
        setFetchError(
          error instanceof Error ? error.message : 'Could not load equipment settings.',
        );

        setSettings({
          equipmentId,
          maxSimultaneousBookings: 1,
          requireAdminApproval: true,
          allowWaitlist: true,
          restrictions: { requiresTraining: false },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [equipmentId]);

  const handleChange = <K extends keyof CapacitySettings>(field: K, value: CapacitySettings[K]) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const handleRestrictionChange = (
    field: keyof CapacitySettings['restrictions'],
    value: boolean,
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      restrictions: { ...settings.restrictions, [field]: value },
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      const url = endpoints.bookings.adminCapacity(equipmentId);
      await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(settings),
      });

      setSaveMessage('Settings saved successfully!');
    } catch (error) {
      setSaveMessage(`Failed: ${error instanceof Error ? error.message : 'Error saving settings'}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-gray-500">
        Loading equipment settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-red-600">
        Unable to load equipment settings.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Capacity & Restrictions</h1>
        <p className="text-gray-600">
          Managing settings for Equipment ID:{' '}
          <span className="rounded bg-gray-100 px-1 font-mono text-sm">{equipmentId}</span>
        </p>
      </div>

      {fetchError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Notice: Loaded fallback configuration ({fetchError}).
        </div>
      )}

      <div className="mb-6 rounded-lg border border-gray-100 bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Live Status</h2>
        <CapacityGauge
          currentBookings={currentUtilization}
          maxCapacity={settings.maxSimultaneousBookings}
        />
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-lg border border-gray-100 bg-white p-6 shadow"
      >
        <div>
          <h2 className="mb-4 border-b pb-2 text-lg font-semibold">Booking Limits</h2>
          <div className="flex max-w-md items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Max Simultaneous Bookings</label>
            <input
              type="number"
              min="1"
              value={settings.maxSimultaneousBookings}
              onChange={(e) =>
                handleChange('maxSimultaneousBookings', parseInt(e.target.value) || 1)
              }
              className="w-24 rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Set to 999 for unlimited capacity.</p>
        </div>

        <div>
          <h2 className="mb-4 border-b pb-2 text-lg font-semibold">Approval Workflow</h2>

          <div className="space-y-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={settings.requireAdminApproval}
                onChange={(e) => handleChange('requireAdminApproval', e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3">
                <span className="block text-sm font-medium text-gray-700">
                  Require Admin Approval
                </span>
                <span className="block text-xs text-gray-500">
                  Users must submit a request instead of booking instantly.
                </span>
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={settings.allowWaitlist}
                onChange={(e) => handleChange('allowWaitlist', e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3">
                <span className="block text-sm font-medium text-gray-700">Enable Waitlist</span>
                <span className="block text-xs text-gray-500">
                  Allow users to join a queue when capacity is full.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <h2 className="mb-4 border-b pb-2 text-lg font-semibold">Safety & Restrictions</h2>
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={settings.restrictions?.requiresTraining ?? false}
              onChange={(e) => handleRestrictionChange('requiresTraining', e.target.checked)}
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-3">
              <span className="block text-sm font-medium text-gray-700">
                Require Safety Certification
              </span>
              <span className="block text-xs text-gray-500">
                Only users with valid training records can book this equipment.
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <span
            className={`text-sm font-medium ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}
          >
            {saveMessage}
          </span>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
