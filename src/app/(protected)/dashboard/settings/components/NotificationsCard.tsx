'use client';

import { useId } from 'react';
import { BellRing, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { InstallSteps, OpenInBrowser } from '@/components/InstallPrompt/InstallPrompt';
import { usePushNotifications, type PushNotificationsState } from '@/hooks/usePushNotifications';
import { SettingsSectionSkeleton } from './SettingsSectionSkeleton';
import { SectionErrorState } from './SectionErrorState';

/**
 * Settings card for push notifications on this device: turn them on or off, choose which kinds,
 * send a test, and see the other devices. The browser's permission prompt appears only after the
 * student taps "Turn on notifications".
 */
export function NotificationsCard() {
  const push = usePushNotifications();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          A short message on this device when something needs your attention, like a training
          reminder or a sign-off result.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardBody push={push} />
        <p className="text-sm text-muted-foreground">
          Login codes and password reset links come by email only, never as a notification.
        </p>
      </CardContent>
    </Card>
  );
}

function CardBody({ push }: { push: PushNotificationsState }) {
  const { status } = push;

  switch (status.kind) {
    case 'loading':
      return <SettingsSectionSkeleton label="Loading notification settings" rows={2} />;

    case 'error':
      return (
        <SectionErrorState
          message="Unable to load your notification settings."
          onRetry={push.retry}
        />
      );

    case 'server-off':
      return (
        <p className="text-sm text-muted-foreground">
          Notifications are not available yet. Everything still arrives by email.
        </p>
      );

    case 'needs-install':
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-purple-light" aria-hidden="true" />
            <p className="text-sm">
              On iPhone and iPad, notifications work once 3D Western is on your Home Screen. Add it,
              then open it from there and come back to this page.
            </p>
          </div>
          <InstallSteps
            mode={status.platform === 'ios-chrome' ? 'ios-chrome-steps' : 'ios-steps'}
          />
        </div>
      );

    case 'open-in-browser':
      return (
        <div className="space-y-2">
          <p className="text-sm">
            Notifications can&apos;t be turned on from inside another app&apos;s browser.
          </p>
          <OpenInBrowser
            mode={status.platform === 'ios-webview' ? 'open-in-safari' : 'open-in-chrome'}
          />
        </div>
      );

    case 'unsupported':
      return (
        <p className="text-sm text-muted-foreground">
          This browser can&apos;t show notifications from 3D Western. Try Chrome, Safari or Firefox
          on your phone, or add the app to your Home Screen.
        </p>
      );

    case 'blocked':
      return (
        <p className="text-sm">
          Notifications are blocked for this site in your browser. Allow them in your browser or
          phone settings for 3D Western, then come back and turn them on here.
        </p>
      );

    case 'off':
      return (
        <Button
          type="button"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => void push.enable()}
          disabled={push.busy === 'enable'}
        >
          <BellRing className="size-4" aria-hidden="true" />
          {push.busy === 'enable' ? 'Turning on...' : 'Turn on notifications'}
        </Button>
      );

    case 'on':
      return <OnDevice push={push} />;
  }
}

function OnDevice({ push }: { push: PushNotificationsState }) {
  const otherDevices = push.devices.filter((device) => device.endpointId !== push.thisDeviceId);
  const groupId = useId();

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium">Notifications are on for this device.</p>

      <fieldset className="space-y-3" aria-labelledby={groupId}>
        <legend id={groupId} className="text-sm font-medium">
          Tell me about
        </legend>
        {push.preferences.map((preference) => {
          const id = `${groupId}-${preference.type}`;
          return (
            <div key={preference.type} className="flex items-start gap-3">
              <Checkbox
                id={id}
                checked={preference.pushEnabled}
                onCheckedChange={(checked) =>
                  void push.setPreference(preference.type, checked === true)
                }
                className="mt-1"
              />
              <label htmlFor={id} className="min-h-6 flex-1 text-sm leading-snug">
                <span className="font-medium">{preference.label}</span>
                <span className="block text-muted-foreground">{preference.description}</span>
              </label>
            </div>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => void push.sendTest()}
          disabled={push.busy === 'test'}
        >
          {push.busy === 'test' ? 'Sending...' : 'Send a test notification'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full sm:w-auto"
          onClick={() => void push.disable()}
          disabled={push.busy === 'disable'}
        >
          {push.busy === 'disable' ? 'Turning off...' : 'Turn off on this device'}
        </Button>
      </div>

      {otherDevices.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Your other devices</h3>
          <ul role="list" className="divide-y rounded-md border">
            {otherDevices.map((device) => (
              <li key={device.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 truncate">{device.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 shrink-0"
                  aria-label={`Remove ${device.label}`}
                  onClick={() => void push.removeDevice(device.id)}
                  disabled={push.busy === `device:${device.id}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
