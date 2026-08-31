'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { FileUploadDropzone } from '@/components/FileUploadDropzone';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { ProjectPurposeField } from '@/components/ProjectPurposeField';
import { toast } from 'sonner';
import { jobApi } from '@/api/client/job';
import { calculateFileChecksum } from '@/lib/file-utils';
import { Routes } from '@/lib/routes';
import { CreateJobRequest } from '@/api/types';

// Type definitions for form options
type MaterialOption = {
  readonly value: string;
  readonly label: string;
};

const WATERJET_MATERIALS: readonly MaterialOption[] = [
  { value: 'steel', label: 'Steel' },
  { value: 'stainless-steel', label: 'Stainless Steel' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'brass', label: 'Brass' },
  { value: 'copper', label: 'Copper' },
  { value: 'titanium', label: 'Titanium' },
  { value: 'stone', label: 'Stone/Marble' },
  { value: 'glass', label: 'Glass' },
] as const;

const WATERJET_FILE_TYPES = {
  accept: {
    'application/dxf': ['.dxf'],
    'application/illustrator': ['.ai'],
    'image/svg+xml': ['.svg'],
    'application/dwg': ['.dwg'],
    'application/acad': ['.dwg'],
  },
  description: 'DXF, AI, SVG, or DWG files',
  validation: 'Please upload a DXF, AI, SVG, or DWG file',
};

type WaterJetFormProps = {
  mockMode?: boolean;
};

export default function WaterJetForm({ mockMode = false }: WaterJetFormProps = {}) {
  const router = useRouter();

  const formSchema = z.object({
    name: z.string().min(1, { message: 'Must have a name for the request' }).max(50),
    description: z.string().min(2, { message: 'Must have a description for the request' }).max(500),
    purpose: z.string().min(1, { message: 'Select a purpose' }),
    material: z.string().min(1, { message: 'Please select a material' }),
    file: z
      .any()
      .refine((f) => f instanceof File, { message: 'Please upload a DXF, AI, SVG, or DWG file' }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      purpose: '',
      material: '',
      file: undefined,
    },
  });

  const { isDirty, isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const file = values.file as File;

      // STEP 1: Create job with file metadata (not the file itself)
      const createJobPayload: CreateJobRequest = {
        jobName: values.name,
        description: values.description,
        category: 'Waterjet',
        formAnswerJson: JSON.stringify({
          purpose: values.purpose,
          material: values.material,
          contentType: file.type || 'application/octet-stream',
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
        contentType: file.type || 'application/octet-stream',
        checksum: checksum,
      });

      // Reset form to prevent unsaved changes warning
      form.reset();
      toast.success('Water jet request submitted successfully');

      // Navigate to dashboard and force refresh to show new data
      router.push(Routes.jobs.home);
      router.refresh();
    } catch (err) {
      toast.error(
        'Failed to submit water jet request. ' + (err instanceof Error ? err.message : ''),
      );
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Request Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Request Name</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => {
              const charCount = field.value?.length || 0;
              const maxChars = 500;
              const isNearLimit = charCount > maxChars * 0.8;
              const isOverLimit = charCount > maxChars;

              return (
                <FormItem>
                  <FormLabel className="text-lg">Description</FormLabel>
                  <FormDescription>
                    Describe your water jet cutting requirements, dimensions, thickness, etc.
                  </FormDescription>
                  <FormControl>
                    <Textarea placeholder="" maxLength={maxChars} {...field} />
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

          {/* Project Purpose */}
          <ProjectPurposeField />

          {/* Material Selection */}
          <FormField
            control={form.control}
            name="material"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Preferred Material</FormLabel>
                <FormDescription>
                  Select your preferred material for water jet cutting
                </FormDescription>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {WATERJET_MATERIALS.map((material) => (
                        <SelectItem key={material.value} value={material.value}>
                          {material.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* File Upload */}
          <FormField
            control={form.control}
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Design File</FormLabel>
                <FormDescription>
                  {WATERJET_FILE_TYPES.description} - {WATERJET_FILE_TYPES.validation}
                </FormDescription>
                <FormControl>
                  <FileUploadDropzone
                    accept={WATERJET_FILE_TYPES.accept}
                    onFileAccepted={(f) => {
                      field.onChange(f ?? undefined);
                    }}
                  />
                </FormControl>
                {/* Show filename preview when present */}
                {field.value && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {(field.value as File).name}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex justify-end border-t pt-6">
            <Button
              type="submit"
              size="default"
              variant="default"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center">
                  <Loader2 className="mr-2 -ml-1 h-4 w-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit'
              )}
            </Button>
          </div>
        </form>
      </Form>

      <UnsavedChangesDialog isDirty={isDirty && !isSubmitting} />
    </div>
  );
}
