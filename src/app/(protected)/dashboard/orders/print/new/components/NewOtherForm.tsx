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
} from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { UnsavedChangesGuard } from '../ui/unsaved-changes-guard';

export type RequestType = 'cnc' | 'laser-cutting' | 'water-jet';

type RequestConfig = {
  title: string;
  description: string;
  fileTypes: {
    accept: Record<string, string[]>;
    description: string;
    validation: string;
  };
  materials: Array<{ value: string; label: string }>;
  apiEndpoint: string;
};

const REQUEST_CONFIGS: Record<RequestType, RequestConfig> = {
  cnc: {
    title: 'CNC Machining',
    description: 'Precision machining from solid materials',
    fileTypes: {
      accept: {
        'model/stl': ['.stl'],
        'application/sla': ['.stl'],
        'application/octet-stream': ['.stl'],
      },
      description: 'STL files only',
      validation: 'Please upload an STL file',
    },
    materials: [
      { value: 'aluminum', label: 'Aluminum' },
      { value: 'steel', label: 'Steel' },
      { value: 'brass', label: 'Brass' },
      { value: 'copper', label: 'Copper' },
      { value: 'plastic', label: 'Plastic (Delrin/Acetal)' },
      { value: 'wood', label: 'Wood' },
    ],
    apiEndpoint: '/api/v1/cnc-orders',
  },
  'laser-cutting': {
    title: 'Laser Cutting',
    description: 'Precise cutting of 2D designs',
    fileTypes: {
      accept: {
        'application/dxf': ['.dxf'],
        'application/illustrator': ['.ai'],
        'image/svg+xml': ['.svg'],
        'application/dwg': ['.dwg'],
        'application/acad': ['.dwg'],
      },
      description: 'DXF, AI, SVG, or DWG files',
      validation: 'Please upload a DXF, AI, SVG, or DWG file',
    },
    materials: [
      { value: 'acrylic', label: 'Acrylic' },
      { value: 'wood', label: 'Wood (Plywood/MDF)' },
      { value: 'cardboard', label: 'Cardboard' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'leather', label: 'Leather' },
      { value: 'paper', label: 'Paper' },
      { value: 'foam', label: 'Foam' },
    ],
    apiEndpoint: '/api/v1/laser-orders',
  },
  'water-jet': {
    title: 'Water Jet Cutting',
    description: 'High-pressure cutting for thick materials',
    fileTypes: {
      accept: {
        'application/dxf': ['.dxf'],
        'application/illustrator': ['.ai'],
        'image/svg+xml': ['.svg'],
        'application/dwg': ['.dwg'],
        'application/acad': ['.dwg'],
      },
      description: 'DXF, AI, SVG, or DWG files',
      validation: 'Please upload a DXF, AI, SVG, or DWG file',
    },
    materials: [
      { value: 'steel', label: 'Steel' },
      { value: 'stainless-steel', label: 'Stainless Steel' },
      { value: 'aluminum', label: 'Aluminum' },
      { value: 'brass', label: 'Brass' },
      { value: 'copper', label: 'Copper' },
      { value: 'titanium', label: 'Titanium' },
      { value: 'stone', label: 'Stone/Marble' },
      { value: 'glass', label: 'Glass' },
    ],
    apiEndpoint: '/api/v1/waterjet-orders',
  },
};

export default function NewOtherRequestForm() {
  const router = useRouter();

  const formSchema = z.object({
    requestType: z.enum(['cnc', 'laser-cutting', 'water-jet']).optional(),
    name: z.string().min(1, { message: 'Must have a name for the request' }).max(50),
    description: z.string().min(2, { message: 'Must have a description for the request' }).max(500),
    material: z.string().min(1, { message: 'Please select a material' }),
    file: z.any().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      requestType: undefined,
      name: '',
      description: '',
      material: '',
      file: undefined,
    },
  });

  const { isDirty, isSubmitting } = form.formState;

  const selectedRequestType = form.watch('requestType');
  const selectedFile = form.watch('file') as File | undefined;

  const currentConfig = selectedRequestType ? REQUEST_CONFIGS[selectedRequestType] : null;

  useEffect(() => {
    if (selectedRequestType) {
      form.setValue('material', '');
      form.setValue('file', undefined);
    }
  }, [selectedRequestType, form]);

  const validateFileType = (file: File, requestType: RequestType): boolean => {
    const fileName = file.name.toLowerCase();
    const config = REQUEST_CONFIGS[requestType];
    const allowedExtensions = Object.values(config.fileTypes.accept).flat();
    return allowedExtensions.some((ext) => fileName.endsWith(ext.toLowerCase()));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.requestType) {
      alert('Please select a request type');
      return;
    }

    const config = REQUEST_CONFIGS[values.requestType];

    if (!values.file || !(values.file instanceof File)) {
      alert(config.fileTypes.validation);
      return;
    }

    try {
      const file = values.file as File;

      if (!validateFileType(file, values.requestType)) {
        throw new Error(config.fileTypes.validation);
      }

      let fileId: string | null = null;

      await new Promise((res) => setTimeout(res, 500));
      if (file) fileId = `mock-${values.requestType}-file-${Date.now()}`;

      const payload = {
        name: values.name,
        description: values.description,
        material: values.material,
        fileId: fileId || '',
        requestType: values.requestType,
        priority: 'standard',
        urgency: 'normal',
      };

      const submitRes = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!submitRes.ok) {
        const text = await submitRes.text();
        throw new Error(text || `${values.requestType} submit failed`);
      }

      const result = await submitRes.json();
      console.log(`MOCK: Created ${values.requestType} order`, result.data?.order?.id);

      router.push('/dashboard');
      if (typeof router.refresh === 'function') {
        router.refresh();
      }
    } catch (err) {
      console.error(`${values.requestType} submit error`, err);
      if (typeof window !== 'undefined') {
        alert(
          `Failed to submit ${values.requestType} request. ` +
            (err instanceof Error ? err.message : ''),
        );
      }
    }
  }

  function CustomDropZone({
    onFileAccepted,
    initialFile,
    requestType,
  }: {
    onFileAccepted: (file: File | null) => void;
    initialFile?: File | undefined;
    requestType?: RequestType;
  }) {
    const [localFiles, setLocalFiles] = useState<File[] | undefined>(
      initialFile ? [initialFile] : undefined,
    );

    useEffect(() => {
      if (initialFile) setLocalFiles([initialFile]);
    }, [initialFile]);

    if (!requestType) {
      return (
        <div className="relative flex h-32 w-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm text-gray-500">Please select a request type first</p>
        </div>
      );
    }

    const config = REQUEST_CONFIGS[requestType];

    return (
      <Dropzone
        src={localFiles}
        maxFiles={1}
        accept={config.fileTypes.accept}
        onDrop={(acceptedFiles: File[]) => {
          if (!acceptedFiles || acceptedFiles.length === 0) {
            setLocalFiles(undefined);
            onFileAccepted(null);
            return;
          }

          const file = acceptedFiles[0];

          // Additional client-side validation
          if (!validateFileType(file, requestType)) {
            alert(config.fileTypes.validation);
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
        <h1 className="text-2xl font-semibold">
          {currentConfig
            ? `Create New ${currentConfig.title} Request`
            : 'Create Manufacturing Request'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {currentConfig ? currentConfig.description : 'Choose a request type to get started'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-xl space-y-4">
          {/* Request Type Selection */}
          <FormField
            control={form.control}
            name="requestType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Request Type</FormLabel>
                <FormDescription>
                  Choose the type of manufacturing request you want to submit
                </FormDescription>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnc">CNC Machining</SelectItem>
                      <SelectItem value="laser-cutting">Laser Cutting</SelectItem>
                      <SelectItem value="water-jet">Water Jet Cutting</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                  {selectedRequestType
                    ? `Describe your ${selectedRequestType} requirements, dimensions, tolerances, etc.`
                    : 'Describe your manufacturing requirements'}
                </FormDescription>
                <FormControl>
                  <Textarea
                    placeholder={
                      selectedRequestType
                        ? `Describe your ${selectedRequestType} request in detail...`
                        : 'Describe your request in detail...'
                    }
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
                  {selectedRequestType
                    ? `Select your preferred material for ${selectedRequestType}`
                    : 'Select your preferred material'}
                </FormDescription>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a material" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentConfig?.materials.map(
                        (material: { value: string; label: string }) => (
                          <SelectItem key={material.value} value={material.value}>
                            {material.label}
                          </SelectItem>
                        ),
                      ) || (
                        <SelectItem disabled value="no-request-type-selected">
                          Please select a request type first
                        </SelectItem>
                      )}
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
                  {currentConfig
                    ? `${currentConfig.fileTypes.description} - ${currentConfig.fileTypes.validation}`
                    : 'Select a request type to see accepted file types'}
                </FormDescription>
                <FormControl>
                  <CustomDropZone
                    requestType={selectedRequestType}
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
              disabled={isSubmitting || !selectedRequestType}
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
              ) : selectedRequestType ? (
                `Submit`
              ) : (
                'Select Request Type'
              )}
            </Button>
          </div>
        </form>
      </Form>

      <UnsavedChangesGuard isDirty={isDirty && !isSubmitting} />
    </div>
  );
}
