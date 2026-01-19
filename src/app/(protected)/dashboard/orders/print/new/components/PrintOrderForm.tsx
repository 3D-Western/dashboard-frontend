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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { UnsavedChangesGuard } from '@/components/ui/unsaved-changes-guard';
import { endpoints } from '@/api/client/endpoints';

type NewPrintFormProps = {
  mockMode?: boolean;
};

export default function NewPrintForm({ mockMode = true }: NewPrintFormProps = {}) {
  const router = useRouter();
  // file will be stored in react-hook-form (we don't need a provider)

  const formSchema = z.object({
    'print-name': z.string().min(1, { message: 'Must have a name for the print request' }).max(30),
    description: z
      .string()
      .min(2, { message: 'Must have a description for the print request' })
      .max(200),
    file: z.any().refine((f) => f instanceof File, { message: 'Please upload an STL file' }),
    'material-1': z.string().min(1, { message: 'Select at least one material' }),
    'color-1': z.string().min(1, { message: 'Select at least one color' }),
    goal: z.string().optional(),
    durability: z.string().optional(),
    infill: z.string().optional(),
    'material-2': z.string().min(1, { message: 'Select at least one material' }),
    'color-2': z.string().min(1, { message: 'Select at least one color' }),
    support: z.string().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      'print-name': '',
      description: '',
      goal: 'high-quality',
      durability: 'general-use',
      infill: 'grid',
      'material-1': '',
      'material-2': '',
      'color-1': '',
      'color-2': '',
      file: undefined,
      support: 'no',
    },
  });
  // material and color option lists
  const MATERIAL_OPTIONS = [
    { value: 'pla', label: 'PLA' },
    { value: 'abs', label: 'ABS' },
    { value: 'petg', label: 'PETG' },
    { value: 'nylon', label: 'Nylon' },
  ];

  const COLOR_OPTIONS = [
    { value: 'black', label: 'Black' },
    { value: 'white', label: 'White' },
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'natural', label: 'Natural' },
  ];

  // watch fields so UI updates reactively when the other choice changes
  const material1Watch = form.watch('material-1');
  const material2Watch = form.watch('material-2');
  const color1Watch = form.watch('color-1');
  const color2Watch = form.watch('color-2');

  const { isDirty, isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const file = values.file as File;
      let fileId: string | null = null;

      // Handle file upload based on mode
      if (mockMode) {
        // Mock mode: simulate file upload
        await new Promise((res) => setTimeout(res, 500));
        if (file) fileId = `mock-file-${Date.now()}`;
      } else {
        // Real mode: actually upload the file
        if (file) {
          const fd = new FormData();
          fd.append('file', file, file.name);

          const uploadRes = await fetch(endpoints.files.upload, {
            method: 'POST',
            body: fd,
          });

          if (!uploadRes.ok) {
            const text = await uploadRes.text();
            throw new Error(text || 'File upload failed');
          }

          const uploadJson = await uploadRes.json();
          fileId = (uploadJson.id ?? uploadJson.fileId ?? null) as string | null;
        }
      }

      // Prepare order payload
      const payload = {
        category: '3d-print',
        name: values['print-name'],
        description: values.description,
        goal: values.goal,
        durability: values.durability,
        infill: values.infill,
        material1: values['material-1'],
        color1: values['color-1'],
        material2: values['material-2'],
        color2: values['color-2'],
        support: values.support,
        stlFileId: fileId || '',
        reprint: null,
      };

      // Submit order
      const submitRes = await fetch(endpoints.orders.create, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!submitRes.ok) {
        const text = await submitRes.text();
        throw new Error(text || 'Submit failed');
      }

      await submitRes.json();

      // Navigate to dashboard and force refresh to show new data
      router.push('/dashboard/print');
      if (typeof router.refresh === 'function') {
        router.refresh(); // Force server component to re-run
      }
    } catch (err) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(
          'Failed to submit print request. ' + (err instanceof Error ? err.message : ''),
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
        accept={{
          'model/stl': ['.stl'],
          // fallback to common .stl MIME types
          'application/sla': ['.stl'],
          'application/octet-stream': ['.stl'],
        }}
        onDrop={(acceptedFiles: File[]) => {
          if (!acceptedFiles || acceptedFiles.length === 0) {
            setLocalFiles(undefined);
            onFileAccepted(null);
            return;
          }

          // pick first .stl by extension, fallback to first file
          const stl =
            acceptedFiles.find((f) => f.name.toLowerCase().endsWith('.stl')) ?? acceptedFiles[0];
          setLocalFiles([stl]);
          onFileAccepted(stl);
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
        <h1 className="text-2xl font-semibold">Create New Print Request</h1>
        <p className="mt-2 text-muted-foreground">Fill out the form to submit a 3D Print.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-xl space-y-4">
          <FormField
            control={form.control}
            name="print-name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Print Name</FormLabel>
                <FormControl>
                  <Input placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Print Description</FormLabel>

                <FormDescription>
                  If this is a part of a project involving multiple prints, please specify.*
                </FormDescription>
                <FormControl>
                  <Textarea placeholder="" {...field} />
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
                  <CustomDropZone
                    initialFile={field.value as File | undefined}
                    onFileAccepted={(f) => {
                      field.onChange(f ?? undefined);
                    }}
                  />
                </FormControl>
                {/* show filename preview when present */}
                {form.watch('file') && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {(form.watch('file') as File).name}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="goal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">What is the primary goal of this print?</FormLabel>
                <FormDescription>
                  The lower the quality, the faster the print will be.*
                </FormDescription>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'high-quality'}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high-quality" id="high-quality" />
                      <label htmlFor="high-quality">High Quality</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="standard" id="standard" />
                      <label htmlFor="standard">Standard</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="rapid-prototyping" id="rapid-prototyping" />
                      <label htmlFor="rapid-prototyping">Rapid Prototyping</label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="durability"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">How strong does the print have to be?</FormLabel>
                <FormDescription>Choose the strength level for the part.</FormDescription>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'general-use'}>
                    <div className="mt-2 flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="aesthetics" id="aesthetics" />
                        <label htmlFor="aesthetics">Aesthetics / Display only</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low-infill" id="low-infill" />
                        <label htmlFor="low-infill">Low infill</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="general-use" id="general-use" />
                        <label htmlFor="general-use">General use (light stress)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="engineering" id="engineering" />
                        <label htmlFor="engineering">Engineering project (high stress)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="as-strong-as-possible" id="as-strong-as-possible" />
                        <label htmlFor="as-strong-as-possible">As strong as possible</label>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="infill"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Do you have a preferred infill pattern?</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'grid'}>
                    <div className="mt-2 flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cubic" id="cubic" />
                        <label htmlFor="cubic">Cubic</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gyroid" id="gyroid" />
                        <label htmlFor="gyroid">Gyroid</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="lines" id="lines" />
                        <label htmlFor="lines">Lines</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="honeycomb" id="honeycomb" />
                        <label htmlFor="honeycomb">Honeycomb</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="grid" id="grid" />
                        <label htmlFor="grid">Grid (default)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rectilinear" id="rectilinear" />
                        <label htmlFor="rectilinear">Rectilinear</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="infill-other" />
                        <label htmlFor="infill-other">Other</label>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <div className="text-lg font-medium">
                Any preferred materials and colors for this print? (2 Choices)
              </div>
              <div className="text-sm text-muted-foreground">
                Some options may run out during busy seasons. Please select a priority (first
                choice) then a backup (second choice) option.
              </div>
            </div>

            <div>
              <FormLabel className="text-lg">First Choice:</FormLabel>
              <div className="mt-4 grid grid-cols-2 items-start gap-4">
                <FormField
                  control={form.control}
                  name="material-1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Material:</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('material-2') === val) {
                              form.setValue('material-2', '');
                            }
                            field.onChange(val ?? '');
                          }}
                          defaultValue={''}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select a material" />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIAL_OPTIONS.filter((o) => o.value !== material2Watch).map(
                              (opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color-1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Color:</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('color-2') === val) {
                              form.setValue('color-2', '');
                            }
                            field.onChange(val ?? '');
                          }}
                          defaultValue={''}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_OPTIONS.filter((o) => o.value !== color2Watch).map((opt) => (
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
              </div>
            </div>

            <div>
              <FormLabel className="text-lg">Second Choice:</FormLabel>
              <div className="mt-4 grid grid-cols-2 items-start gap-4">
                <FormField
                  control={form.control}
                  name="material-2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Material:</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('material-1') === val) {
                              form.setValue('material-1', '');
                            }
                            field.onChange(val ?? undefined);
                          }}
                          defaultValue={undefined}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select a material" />
                          </SelectTrigger>
                          <SelectContent>
                            {MATERIAL_OPTIONS.filter((o) => o.value !== material1Watch).map(
                              (opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color-2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Color:</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('color-1') === val) {
                              form.setValue('color-1', '');
                            }
                            field.onChange(val ?? undefined);
                          }}
                          defaultValue={undefined}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select a color" />
                          </SelectTrigger>
                          <SelectContent>
                            {COLOR_OPTIONS.filter((o) => o.value !== color1Watch).map((opt) => (
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
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name="support"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">Do you want to disable print supports?</FormLabel>
                <FormDescription>Print supports are enabled by default.</FormDescription>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'no'}>
                    <div className="mt-2 flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="supports-yes" />
                        <label htmlFor="supports-yes">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="supports-no" />
                        <label htmlFor="supports-no">No</label>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="sm"
                variant="default"
                disabled={form.formState.isSubmitting}
                aria-busy={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
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
                  'Submit'
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
      <UnsavedChangesGuard isDirty={isDirty && !isSubmitting} />
    </div>
  );
}
