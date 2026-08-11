'use client';

import { useState, useEffect } from 'react';
import CapacityGauge from './CapacityGauge';
import { CapacitySettings } from '@/types/booking';

// IMPORT API TOOLS:
import { apiRequest } from '@/api/client/base';
import { endpoints } from '@/api/client/endpoints';

interface CapacityManagementClientProps {
  equipmentId: string;
}

export function CapacityManagementClient({ equipmentId }: CapacityManagementClientProps) {
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
      <div className="mx-auto max-w-3xl p-8 text-center text-muted-foreground">
        Loading equipment settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center text-destructive">
        Unable to load equipment settings.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-6 text-sm text-muted-foreground">
        Managing settings for Equipment ID:{' '}
        <span className="rounded bg-muted px-1 font-mono text-sm text-foreground">
          {equipmentId}
        </span>
      </p>

      {fetchError && (
        <div className="mb-4 rounded-md border border-status-flagged bg-status-flagged/20 p-3 text-sm text-status-flagged-foreground">
          Notice: Loaded fallback configuration ({fetchError}).
        </div>
      )}

      <div className="mb-6 rounded-lg border border-border bg-card p-6 text-card-foreground shadow">
        <h2 className="mb-4 text-lg font-semibold">Live Status</h2>
        <CapacityGauge
          currentBookings={currentUtilization}
          maxCapacity={settings.maxSimultaneousBookings}
        />
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-lg border border-border bg-card p-6 text-card-foreground shadow"
      >
        <div>
          <h2 className="mb-4 border-b border-border pb-2 text-lg font-semibold">Booking Limits</h2>
          <div className="flex max-w-md items-center justify-between">
            <label className="text-sm font-medium">Max Simultaneous Bookings</label>
            <input
              type="number"
              min="1"
              value={settings.maxSimultaneousBookings}
              onChange={(e) =>
                handleChange('maxSimultaneousBookings', parseInt(e.target.value) || 1)
              }
              className="w-24 rounded-md border border-input bg-background p-2 text-foreground shadow-sm focus:border-ring focus:ring-ring"
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Set to 999 for unlimited capacity.</p>
        </div>

        <div>
          <h2 className="mb-4 border-b border-border pb-2 text-lg font-semibold">
            Approval Workflow
          </h2>

          <div className="space-y-4">
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={settings.requireAdminApproval}
                onChange={(e) => handleChange('requireAdminApproval', e.target.checked)}
                className="mt-1 rounded border-input text-primary focus:ring-ring"
              />
              <span className="ml-3">
                <span className="block text-sm font-medium">Require Admin Approval</span>
                <span className="block text-xs text-muted-foreground">
                  Users must submit a request instead of booking instantly.
                </span>
              </span>
            </label>

            <label className="flex items-start">
              <input
                type="checkbox"
                checked={settings.allowWaitlist}
                onChange={(e) => handleChange('allowWaitlist', e.target.checked)}
                className="mt-1 rounded border-input text-primary focus:ring-ring"
              />
              <span className="ml-3">
                <span className="block text-sm font-medium">Enable Waitlist</span>
                <span className="block text-xs text-muted-foreground">
                  Allow users to join a queue when capacity is full.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <h2 className="mb-4 border-b border-border pb-2 text-lg font-semibold">
            Safety &amp; Restrictions
          </h2>
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={settings.restrictions?.requiresTraining ?? false}
              onChange={(e) => handleRestrictionChange('requiresTraining', e.target.checked)}
              className="mt-1 rounded border-input text-primary focus:ring-ring"
            />
            <span className="ml-3">
              <span className="block text-sm font-medium">Require Safety Certification</span>
              <span className="block text-xs text-muted-foreground">
                Only users with valid training records can book this equipment.
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <span
            className={`text-sm font-medium ${saveMessage.includes('Failed') ? 'text-destructive' : 'text-status-success-foreground'}`}
          >
            {saveMessage}
          </span>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
