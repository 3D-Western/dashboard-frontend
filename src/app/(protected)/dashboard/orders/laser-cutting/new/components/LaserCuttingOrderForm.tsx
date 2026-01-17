'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Dropzone, { DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone';
import { useEffect, useState } from 'react';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UnsavedChangesGuard } from '@/components/ui/unsaved-changes-guard';
import { endpoints } from '@/api/client/endpoints';

const LASER_MATERIALS = [
  { value: 'acrylic', label: 'Acrylic' },
  { value: 'wood', label: 'Wood (Plywood/MDF)' },
  { value: 'cardboard', label: 'Cardboard' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'leather', label: 'Leather' },
  { value: 'paper', label: 'Paper' },
  { value: 'foam', label: 'Foam' },
];

const LASER_FILE_TYPES = {
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

export default function LaserCuttingOrderForm() {
  const router = useRouter();

  const formSchema = z.object({
    name: z.string().min(1, { message: 'Must have a name for the request' }).max(50),
    description: z.string().min(2, { message: 'Must have a description for the request' }).max(500),
    material: z.string().min(1, { message: 'Please select a material' }),
    file: z.any().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      material: '',
      file: undefined,
    },
  });

  const { isDirty, isSubmitting } = form.formState;
  const selectedFile = form.watch('file') as File | undefined;

  const validateFileType = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const allowedExtensions = Object.values(LASER_FILE_TYPES.accept).flat();
    return allowedExtensions.some((ext) => fileName.endsWith(ext.toLowerCase()));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.file || !(values.file instanceof File)) {
      alert(LASER_FILE_TYPES.validation);
      return;
    }

    try {
      const file = values.file as File;

      if (!validateFileType(file)) {
        throw new Error(LASER_FILE_TYPES.validation);
      }

      let fileId: string | null = null;

      await new Promise((res) => setTimeout(res, 500));
      if (file) fileId = `mock-laser-file-${Date.now()}`;

      const payload = {
        category: 'laser-cutting',
        name: values.name,
        description: values.description,
        material: values.material,
        fileId: fileId || '',
        priority: 'standard',
        urgency: 'normal',
      };

      const submitRes = await fetch(endpoints.orders.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!submitRes.ok) {
        const text = await submitRes.text();
        throw new Error(text || 'Laser cutting order submit failed');
      }

      const result = await submitRes.json();
      console.log('MOCK: Created laser cutting order', result.data?.order?.id);

      router.push('/dashboard');
      if (typeof router.refresh === 'function') {
        router.refresh();
      }
    } catch (err) {
      console.error('Laser cutting submit error', err);
      if (typeof window !== 'undefined') {
        alert(
          'Failed to submit laser cutting request. ' +
            (err instanceof Error ? err.message : ''),
        );
      }
    }
  }

  function CustomDropZone({
    onFileAccepted,
    initialFile,
  }: {
    onFileAccepted: (file: File | null) => void;
    initialFile?: File | undefined;
  }) {
    const [localFiles, setLocalFiles] = useState<File[] | undefined>(
      initialFile ? [initialFile] : undefined,
    );

    useEffect(() => {
      if (initialFile) setLocalFiles([initialFile]);
    }, [initialFile]);

    return (
      <Dropzone
        src={localFiles}
        maxFiles={1}
        accept={LASER_FILE_TYPES.accept}
        onDrop={(acceptedFiles: File[]) => {
          if (!acceptedFiles || acceptedFiles.length === 0) {
            setLocalFiles(undefined);
            onFileAccepted(null);
            return;
          }

          const file = acceptedFiles[0];

          // Additional client-side validation
          if (!validateFileType(file)) {
            alert(LASER_FILE_TYPES.validation);
            return;
          }

          setLocalFiles([file]);
          onFileAccepted(file);
        }}
      >
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Create New Laser Cutting Request</h1>
        <p className="mt-2 text-muted-foreground">
          Precise cutting of 2D designs
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-xl space-y-4">
          {/* Request Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Request Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter request name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Description</FormLabel>
                <FormDescription>
                  Describe your laser cutting requirements, dimensions, thickness, etc.
                </FormDescription>
                <FormControl>
                  <Textarea
                    placeholder="Describe your laser cutting request in detail..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Material Selection */}
          <FormField
            control={form.control}
            name="material"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Preferred Material</FormLabel>
                <FormDescription>
                  Select your preferred material for laser cutting
                </FormDescription>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {LASER_MATERIALS.map((material) => (
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
                  {LASER_FILE_TYPES.description} - {LASER_FILE_TYPES.validation}
                </FormDescription>
                <FormControl>
                  <CustomDropZone
                    initialFile={field.value as File | undefined}
                    onFileAccepted={(f) => {
                      field.onChange(f ?? undefined);
                    }}
                  />
                </FormControl>
                {/* Show filename preview when present */}
                {selectedFile && (
                  <div className="mt-2 text-sm text-muted-foreground">{selectedFile.name}</div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="default"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center">
                  <svg
                    className="mr-2 -ml-1 h-4 w-4 animate-spin text-current"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Laser Cutting Request'
              )}
            </Button>
          </div>
        </form>
      </Form>

      <UnsavedChangesGuard isDirty={isDirty && !isSubmitting} />
    </div>
  );
}
