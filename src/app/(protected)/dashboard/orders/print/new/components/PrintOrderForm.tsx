'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FileUploadDropzone } from '../../../../../../../components/FileUploadDropzone';
import { ColorSelect, type ColorOption } from '@/components/ColorSelect';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { UnsavedChangesGuard } from '@/components/ui/unsaved-changes-guard';
import { jobApi } from '@/api/client/job';
import { calculateFileChecksum } from '@/lib/file-utils';
import { Routes } from '@/lib/routes';
import { toast } from 'sonner';
import { CreateOrderRequest } from '@/api/types';

// Type definitions for form options
type RadioOption = {
  readonly value: string;
  readonly label: string;
  readonly id: string;
};

type MaterialOption = {
  readonly value: string;
  readonly label: string;
};

const MATERIAL_OPTIONS: readonly MaterialOption[] = [
  { value: 'pla', label: 'PLA' },
  { value: 'abs', label: 'ABS' },
  { value: 'petg', label: 'PETG' },
  { value: 'nylon', label: 'Nylon' },
] as const;

const COLOR_OPTIONS: readonly ColorOption[] = [
  { value: 'black', label: 'Black', hexColor: '#000000' },
  { value: 'white', label: 'White', hexColor: '#FFFFFF' },
  { value: 'red', label: 'Red', hexColor: '#EF4444' },
  { value: 'blue', label: 'Blue', hexColor: '#3B82F6' },
  { value: 'natural', label: 'Natural', hexColor: '#F5F5DC' },
] as const;

const GOAL_OPTIONS: readonly RadioOption[] = [
  { value: 'high-quality', label: 'High Quality', id: 'high-quality' },
  { value: 'standard', label: 'Standard', id: 'standard' },
  { value: 'rapid-prototyping', label: 'Rapid Prototyping', id: 'rapid-prototyping' },
] as const;

const DURABILITY_OPTIONS: readonly RadioOption[] = [
  { value: 'aesthetics', label: 'Aesthetics / Display only', id: 'aesthetics' },
  { value: 'low-infill', label: 'Low infill', id: 'low-infill' },
  { value: 'general-use', label: 'General use (light stress)', id: 'general-use' },
  { value: 'engineering', label: 'Engineering project (high stress)', id: 'engineering' },
  {
    value: 'as-strong-as-possible',
    label: 'As strong as possible',
    id: 'as-strong-as-possible',
  },
] as const;

const INFILL_OPTIONS: readonly RadioOption[] = [
  { value: 'cubic', label: 'Cubic', id: 'cubic' },
  { value: 'gyroid', label: 'Gyroid', id: 'gyroid' },
  { value: 'lines', label: 'Lines', id: 'lines' },
  { value: 'honeycomb', label: 'Honeycomb', id: 'honeycomb' },
  { value: 'grid', label: 'Grid (default)', id: 'grid' },
  { value: 'rectilinear', label: 'Rectilinear', id: 'rectilinear' },
  { value: 'other', label: 'Other', id: 'infill-other' },
] as const;

const SUPPORT_OPTIONS: readonly RadioOption[] = [
  { value: 'yes', label: 'Yes, disable supports', id: 'supports-yes' },
  { value: 'no', label: 'No, keep supports enabled', id: 'supports-no' },
] as const;

const formSchema = z.object({
  printName: z.string().min(1, { message: 'Must have a name for the print request' }).max(30),
  description: z
    .string()
    .min(2, { message: 'Must have a description for the print request' })
    .max(200),
  file: z.any().refine((f) => f instanceof File, { message: 'Please upload an STL file' }),
  material1: z.string().min(1, { message: 'Select at least one material' }),
  color1: z.string().min(1, { message: 'Select at least one color' }),
  goal: z.string().optional(),
  durability: z.string().optional(),
  infill: z.string().optional(),
  material2: z.string().min(1, { message: 'Select at least one material' }),
  color2: z.string().min(1, { message: 'Select at least one color' }),
  support: z.string().optional(),
});

type NewPrintFormProps = {
  mockMode?: boolean;
};

export default function NewPrintForm({ mockMode = false }: NewPrintFormProps = {}) {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      printName: '',
      description: '',
      goal: 'high-quality',
      durability: 'general-use',
      infill: 'grid',
      material1: '',
      material2: '',
      color1: '',
      color2: '',
      file: undefined,
      support: 'no',
    },
  });

  // watch fields so UI updates reactively when the other choice changes
  const material1Watch = form.watch('material1');
  const material2Watch = form.watch('material2');
  const color1Watch = form.watch('color1');
  const color2Watch = form.watch('color2');

  const { isDirty, isSubmitting } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const file = values.file as File;

      if (mockMode) {
        // Mock mode: simulate the entire flow
        await new Promise((res) => setTimeout(res, 500));
        form.reset();
        toast.success('Print request submitted successfully');
        router.push(Routes.orders.home);
        router.refresh();
        return;
      }

      // STEP 1: Create order with file metadata (not the file itself)
      const createOrderPayload: CreateOrderRequest = {
        printName: values.printName,
        description: values.description,
        formAnswerJson: JSON.stringify({
          contentType: file.type || 'application/sla',
          material1: values.material1,
          color1: values.color1,
          material2: values.material2,
          color2: values.color2,
          goal: values.goal,
          durability: values.durability,
          infill: values.infill,
          support: values.support,
        }),
      };

      const createOrderResponse = await jobApi.createOrder(createOrderPayload);

      if (!createOrderResponse.orderId || !createOrderResponse.uploadUrl) {
        throw new Error('Invalid response from server: missing orderId or uploadUrl');
      }

      // STEP 2: Upload file to presigned URL
      await jobApi.uploadOrderFile(createOrderResponse.uploadUrl, file);

      // STEP 3: Complete upload with file metadata
      const checksum = await calculateFileChecksum(file);

      await jobApi.completeUpload(createOrderResponse.orderId, {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/sla',
        checksum: checksum,
      });

      // Reset form to prevent unsaved changes warning
      form.reset();
      toast.success('Print request submitted successfully');

      // Navigate to dashboard and force refresh to show new data
      router.push(Routes.orders.home);
      router.refresh();
    } catch (err) {
      toast.error(
        'Failed to submit print request. ' + (err instanceof Error ? err.message : 'Unknown error'),
      );
    }
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
            name="printName"
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
            render={({ field }) => {
              const charCount = field.value?.length || 0;
              const maxChars = 200;
              const isNearLimit = charCount > maxChars * 0.8;
              const isOverLimit = charCount > maxChars;

              return (
                <FormItem>
                  <FormLabel className="text-lg">Print Description</FormLabel>

                  <FormDescription>
                    If this is a part of a project involving multiple prints, please specify.*
                  </FormDescription>
                  <FormControl>
                    <Textarea placeholder="" {...field} />
                  </FormControl>
                  <div className="flex justify-between items-center">
                    <FormMessage />
                    <span
                      className={`text-sm ${
                        isOverLimit
                          ? 'text-destructive font-medium'
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
            name="goal"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg">What is the primary goal of this print?</FormLabel>
                <FormDescription>
                  The lower the quality, the faster the print will be.*
                </FormDescription>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'high-quality'}>
                    {GOAL_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={option.id} />
                        <label htmlFor={option.id}>{option.label}</label>
                      </div>
                    ))}
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
                      {DURABILITY_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.id} />
                          <label htmlFor={option.id}>{option.label}</label>
                        </div>
                      ))}
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
                      {INFILL_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.id} />
                          <label htmlFor={option.id}>{option.label}</label>
                        </div>
                      ))}
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
                  name="material1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Material:</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('material2') === val) {
                              form.setValue('material2', '');
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
                  name="color1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Color:</FormLabel>
                      <FormControl>
                        <ColorSelect
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('color2') === val) {
                              form.setValue('color2', '');
                            }
                            field.onChange(val ?? '');
                          }}
                          options={COLOR_OPTIONS}
                          excludeValue={color2Watch}
                          placeholder="Select a color"
                        />
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
                  name="material2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Material:</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('material1') === val) {
                              form.setValue('material1', '');
                            }
                            field.onChange(val ?? '');
                          }}
                          defaultValue={''}
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
                  name="color2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Color:</FormLabel>
                      <FormControl>
                        <ColorSelect
                          value={field.value}
                          onValueChange={(val) => {
                            if (form.getValues('color1') === val) {
                              form.setValue('color1', '');
                            }
                            field.onChange(val ?? '');
                          }}
                          options={COLOR_OPTIONS}
                          excludeValue={color1Watch}
                          placeholder="Select a color"
                        />
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
                <FormLabel className="text-lg">Print Supports</FormLabel>
                <FormDescription>
                  Supports help prevent sagging and improve print quality for overhangs.
                </FormDescription>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value ?? 'no'}>
                    <div className="mt-2 flex items-center space-x-4">
                      {SUPPORT_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.id} />
                          <label htmlFor={option.id}>{option.label}</label>
                        </div>
                      ))}
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
