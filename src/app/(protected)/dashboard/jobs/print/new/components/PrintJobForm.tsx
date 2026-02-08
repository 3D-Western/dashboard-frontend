'use client';

import React from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { UnsavedChangesGuard } from '@/components/ui/unsaved-changes-guard';
import { jobApi } from '@/api/client/job';
import { calculateFileChecksum } from '@/lib/file-utils';
import { Routes } from '@/lib/routes';
import { toast } from 'sonner';
import { CreateJobRequest } from '@/api/types';

// Type definitions for form options
type MaterialOption = {
  readonly value: string;
  readonly label: string;
};

const PURPOSE_OPTIONS: readonly MaterialOption[] = [
  { value: 'casual', label: 'Casual / Recreation' },
  { value: 'personal', label: 'Personal Project' },
  { value: 'school', label: 'School Project' },
  { value: 'research', label: 'Academic Research' },
  { value: 'community', label: 'Charity / Community' },
  { value: 'product', label: 'Product Development' },
] as const;

const DESIGN_INTENT_OPTIONS: readonly MaterialOption[] = [
  { value: 'functional', label: 'Optimized for standard fit, practical use, and assemblies' },
  { value: 'visual', label: 'Optimized for appearance, aesthetics, and non-functional display' },
  { value: 'structural', label: 'Optimized for load-bearing, high-stress, or tool-like use' },
] as const;

const formSchema = z.object({
  jobName: z.string().min(1, { message: 'Must have a name for the print request' }).max(30),
  description: z
    .string()
    .min(2, { message: 'Must have a description for the print request' })
    .max(200),
  purpose: z.string().min(1, { message: 'Select a purpose' }),
  design_intent: z.string().min(1, { message: 'Select a design intent' }),
  file: z.any().refine((f) => f instanceof File, { message: 'Please upload an STL file' }),
});

type NewPrintFormProps = {
  mockMode?: boolean;
};

export default function NewPrintForm({ mockMode = false }: NewPrintFormProps = {}) {
  const router = useRouter();
  const [retryMode, setRetryMode] = React.useState<{
    jobId: string;
    fileId: string;
  } | null>(null);

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
      let jobId: string;
      let fileId: string;
      let uploadUrl: string;

      // Check if we're in retry mode or creating a new job
      if (retryMode) {
        // RETRY MODE: Get new presigned URL for existing job
        const retryResponse = await jobApi.retryUpload(retryMode.jobId);
        jobId = retryMode.jobId;
        fileId = retryResponse.fileId;
        uploadUrl = retryResponse.presignedUrl;
      } else {
        // NEW JOB MODE: Create job with file metadata
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

        jobId = createJobResponse.jobId;
        fileId = createJobResponse.fileId;
        uploadUrl = createJobResponse.uploadUrl;
      }

      // STEP 2: Upload file to presigned URL (skip in mock mode to avoid CORS)
      if (!mockMode) {
        try {
          await jobApi.uploadJobFile(uploadUrl, file);
        } catch (uploadError) {
          // Store jobId and fileId for retry
          setRetryMode({ jobId, fileId });
          throw new Error(
            'File upload failed. Please try submitting again to retry the upload. ' +
              (uploadError instanceof Error ? uploadError.message : 'Unknown error'),
          );
        }
      }

      // STEP 3: Complete upload with file metadata
      const checksum = await calculateFileChecksum(file);

      await jobApi.completeUpload(jobId, {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/sla',
        checksum: checksum,
      });

      // Reset form and retry mode on success
      form.reset();
      setRetryMode(null);
      toast.success(retryMode ? 'File uploaded successfully' : 'Print request submitted successfully');

      // Navigate to dashboard and force refresh to show new data
      router.push(Routes.jobs.home);
      router.refresh();
    } catch (err) {
      toast.error(
        'Failed to submit print request. ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="jobName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Project Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Robot Arm Gear – Revision B" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Upload STL</FormLabel>
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
                  <FormLabel className="text-lg">Print Description</FormLabel>

                  <FormDescription>Describe what you are making (1-2 sentences).*</FormDescription>
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

          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Project Purpose</FormLabel>
                <FormDescription>What is this project primarily for?*</FormDescription>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      if (form.getValues('purpose') === val) {
                        form.setValue('purpose', '');
                      }
                      field.onChange(val ?? '');
                    }}
                    defaultValue={''}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select a purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {PURPOSE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="design_intent"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Design Intent</FormLabel>
                <FormDescription>How would you classify this object?*</FormDescription>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'grid'}>
                    <div className="mt-2 flex flex-col space-y-2">
                      {DESIGN_INTENT_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <label htmlFor={option.value}>{option.label}</label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end border-t pt-6">
            {retryMode && (
              <div className="mr-4 flex items-center text-sm text-amber-600 dark:text-amber-500">
                <span>Job created. Click submit to retry file upload.</span>
              </div>
            )}
            <Button
              type="submit"
              size="default"
              variant="default"
              disabled={form.formState.isSubmitting}
              aria-busy={form.formState.isSubmitting}
              className="min-w-[120px]"
            >
              {form.formState.isSubmitting ? (
                <span className="inline-flex items-center">
                  <Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin" />
                  {retryMode ? 'Uploading...' : 'Submitting...'}
                </span>
              ) : retryMode ? (
                'Retry Upload'
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </form>
      </Form>
      <UnsavedChangesGuard isDirty={isDirty && !isSubmitting} />
    </div>
  );
}
