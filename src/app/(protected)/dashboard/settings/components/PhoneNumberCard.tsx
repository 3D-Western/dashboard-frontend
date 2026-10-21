'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { TextConsentCheckbox } from '@/components/TextConsentCheckbox';
import { userApi } from '@/api/client/user';
import { ApiError } from '@/api/client/errors';
import {
  isAcceptablePhoneInput,
  normalizePhoneNumber,
  PHONE_NUMBER_ERROR,
  phoneRequestFields,
  SMS_OPT_IN_NEEDS_PHONE_ERROR,
} from '@/lib/phone';
import { SettingsSectionSkeleton } from './SettingsSectionSkeleton';
import { SectionErrorState } from './SectionErrorState';

const phoneSchema = z
  .object({
    phoneNumber: z.string().trim().refine(isAcceptablePhoneInput, PHONE_NUMBER_ERROR),
    smsOptIn: z.boolean(),
  })
  .refine((values) => !values.smsOptIn || values.phoneNumber !== '', {
    message: SMS_OPT_IN_NEEDS_PHONE_ERROR,
    path: ['smsOptIn'],
  });

type PhoneFormData = z.infer<typeof phoneSchema>;

interface SavedPhoneSettings {
  phoneNumber: string | null;
  smsOptIn: boolean;
}

// Field names the backend may attach a message to (InvalidPhoneException.field).
const FIELD_NAMES = ['phoneNumber', 'smsOptIn'] as const;

function fieldMessagesFrom(
  details: unknown,
): Partial<Record<(typeof FIELD_NAMES)[number], string>> {
  if (typeof details !== 'object' || details === null) return {};
  const messages: Partial<Record<(typeof FIELD_NAMES)[number], string>> = {};
  for (const name of FIELD_NAMES) {
    const value = (details as Record<string, unknown>)[name];
    if (typeof value === 'string') messages[name] = value;
  }
  return messages;
}

/** True when the typed number is the one already saved (both blank counts as the same). */
function isSavedNumber(typed: string, saved: string | null): boolean {
  const normalised = typed.trim() === '' ? null : normalizePhoneNumber(typed);
  return normalised === saved;
}

export function PhoneNumberCard() {
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<SavedPhoneSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: '', smsOptIn: false },
  });
  const phoneValue = useWatch({ control: form.control, name: 'phoneNumber' });
  const hasPhone = phoneValue.trim() !== '';

  const applySaved = useCallback(
    (settings: SavedPhoneSettings) => {
      setSaved(settings);
      form.reset({ phoneNumber: settings.phoneNumber ?? '', smsOptIn: settings.smsOptIn });
    },
    [form],
  );

  useEffect(() => {
    let cancelled = false;
    userApi
      .getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        applySaved({ phoneNumber: profile.phoneNumber, smsOptIn: profile.smsOptIn });
        setLoadState('ready');
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [applySaved, attempt]);

  async function onSubmit(values: PhoneFormData) {
    try {
      setIsSaving(true);
      const profile = await userApi.updatePhoneSettings(
        phoneRequestFields(values.phoneNumber, values.smsOptIn),
      );
      applySaved({ phoneNumber: profile.phoneNumber, smsOptIn: profile.smsOptIn });
      toast.success('Phone and text settings saved');
    } catch (error) {
      if (error instanceof ApiError) {
        const messages = fieldMessagesFrom(error.details);
        const fields = Object.keys(messages) as (typeof FIELD_NAMES)[number][];
        if (fields.length > 0) {
          fields.forEach((name) => form.setError(name, { message: messages[name] }));
        } else {
          toast.error(error.message || 'Failed to save your phone settings');
        }
      } else {
        toast.error('Failed to connect to the server. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mobile number</CardTitle>
        <CardDescription>
          Optional. Used only for text messages about your prints and access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loadState === 'loading' ? (
          <SettingsSectionSkeleton label="Loading mobile number" rows={2} />
        ) : loadState === 'error' || !saved ? (
          <SectionErrorState
            message="Unable to load your mobile number settings."
            onRetry={() => {
              setLoadState('loading');
              setAttempt((n) => n + 1);
            }}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile number</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="519-555-1234"
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          // Consent is for one number: a different number starts unticked.
                          if (!isSavedNumber(event.target.value, saved.phoneNumber)) {
                            form.setValue('smsOptIn', false);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="smsOptIn"
                render={({ field }) => (
                  <FormItem>
                    <TextConsentCheckbox
                      id="settings-sms-opt-in"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!hasPhone}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
