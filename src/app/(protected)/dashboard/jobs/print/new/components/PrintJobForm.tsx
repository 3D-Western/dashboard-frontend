'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FileUploadDropzone } from '@/components/FileUploadDropzone';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { jobApi } from '@/api/client/job';
import { ApiError, ErrorCodes } from '@/api/client/errors';
import { calculateFileChecksum } from '@/lib/file-utils';
import { Routes } from '@/lib/routes';
import { toast } from 'sonner';
import { CreateJobRequest } from '@/api/types';
import { PurposeChips } from './PurposeChips';
import { DesignIntentCards } from './DesignIntentCards';
import { OrientationLockNotice } from '@/components/Training/OrientationLockNotice';
import { TrainingErrorCodes } from '@/api/client/training-errors';

const formSchema = z.object({
  jobName: z
    .string()
    .min(1, { message: 'Must have a name for the print request' })
    .max(30, { message: 'Keep it to 30 characters or fewer' }),
  description: z
    .string()
    .min(2, { message: 'Must have a description for the print request' })
    .max(200),
  purpose: z.string().min(1, { message: "Select what it's for" }),
  design_intent: z.string().min(1, { message: 'Select how it will be used' }),
  file: z.any().refine((f) => f instanceof File, { message: 'Please upload an STL file' }),
});

type NewPrintFormProps = {
  mockMode?: boolean;
};

export default function NewPrintForm({ mockMode = false }: NewPrintFormProps = {}) {
  const router = useRouter();
  // Set when the server refuses the submit because Maker Orientation isn't done
  const [orientationRequired, setOrientationRequired] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobName: '',
      description: '',
      purpose: '',
      design_intent: '',
      file: undefined,
    },
  });

  const { isDirty, isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const file = values.file as File;

      // STEP 1: Create job with file metadata (not the file itself)
      const createJobPayload: CreateJobRequest = {
        jobName: values.jobName,
        description: values.description,
        category: 'ThreeDPrint',
        formAnswerJson: JSON.stringify({
          purpose: values.purpose,
          design_intent: values.design_intent,
          contentType: file.type || 'application/sla',
        }),
      };

      const createJobResponse = await jobApi.createJob(createJobPayload);

      if (!createJobResponse.jobId || !createJobResponse.uploadUrl) {
        throw new Error('Invalid response from server: missing jobId or uploadUrl');
      }

      // STEP 2: Upload file to presigned URL (skip in mock mode to avoid CORS)
      if (!mockMode) {
        await jobApi.uploadJobFile(createJobResponse.uploadUrl, file);
      }

      // STEP 3: Complete upload with file metadata
      const checksum = await calculateFileChecksum(file);

      await jobApi.completeUpload(createJobResponse.jobId, {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/sla',
        checksum: checksum,
      });

      // Reset form to prevent unsaved changes warning
      form.reset();
      toast.success('Print request submitted successfully');

      // Navigate to dashboard and force refresh to show new data
      router.push(Routes.jobs.printSubmitted);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === TrainingErrorCodes.ORIENTATION_REQUIRED) {
        setOrientationRequired(true);
        toast.error('Finish Maker Orientation to submit prints.');
        return;
      }
      if (err instanceof ApiError && err.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
        toast.error(
          "You've reached your print limit for now. You can submit again once it resets.",
        );
        return;
      }
      toast.error(
        'Failed to submit print request. ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  }

  return (
    <div className="w-full max-w-5xl">
      {orientationRequired && <OrientationLockNotice interrupt className="mb-8" />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="jobName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Project title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Robot Arm Gear – Revision B" maxLength={30} {...field} />
                </FormControl>
                <div className="flex items-center justify-between">
                  <FormMessage />
                  <span
                    className={`text-sm ${
                      (field.value?.length || 0) >= 27
                        ? 'text-amber-600 dark:text-amber-500'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {field.value?.length || 0}/30
                  </span>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">STL file</FormLabel>
                <FormControl>
                  <FileUploadDropzone
                    initialFile={field.value as File | undefined}
                    onFileAccepted={(f) => {
                      field.onChange(f ?? undefined);
                    }}
                    accept={{
                      'model/stl': ['.stl'],
                      'application/sla': ['.stl'],
                      'application/octet-stream': ['.stl'],
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => {
              const charCount = field.value?.length || 0;
              const maxChars = 200;
              const isNearLimit = charCount > maxChars * 0.8;
              const isOverLimit = charCount > maxChars;

              return (
                <FormItem>
                  <FormLabel className="text-lg">Description</FormLabel>
                  <FormDescription>What are you making? One or two sentences.</FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. A replacement gear for a robot arm in my MME 4499 capstone project."
                      maxLength={maxChars}
                      {...field}
                    />
                    {/* AI scans this text to auto-tag course codes, domains, or project types. */}
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <span
                      className={`text-sm ${
                        isOverLimit
                          ? 'font-medium text-destructive'
                          : isNearLimit
                            ? 'text-amber-600 dark:text-amber-500'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {charCount}/{maxChars}
                    </span>
                  </div>
                </FormItem>
              );
            }}
          />

          <PurposeChips />
          <DesignIntentCards />
          {/* Phones: the submit stays in reach at the bottom of a long form. Desktop: inline. */}
          <div className="sticky bottom-0 z-10 flex justify-end border-t bg-background py-3 md:static md:bg-transparent md:pt-6 md:pb-0">
            <Button
              type="submit"
              size="default"
              variant="default"
              disabled={form.formState.isSubmitting || orientationRequired}
              aria-busy={form.formState.isSubmitting}
              className="min-h-11 w-full md:min-h-0 md:w-auto md:min-w-[120px]"
            >
              {form.formState.isSubmitting ? (
                <span className="inline-flex items-center">
                  <Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit job'
              )}
            </Button>
          </div>
        </form>
      </Form>
      <UnsavedChangesDialog isDirty={isDirty && !isSubmitting} />
    </div>
  );
}
