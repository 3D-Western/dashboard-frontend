'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Dropzone, { DropzoneContent, DropzoneEmptyState } from '@/components/ui/dropzone';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';

export default function NewPrintForm() {
  const router = useRouter();
  // file will be stored in react-hook-form (we don't need a provider)

  const formSchema = z.object({
    'print-name': z.string().min(1).max(30),
    description: z.string().min(2).max(200),
    file: z.any().refine((f) => f instanceof File, { message: 'Please upload an STL file' }),
    'material-1': z.string().min(1, { message: 'Select at least one material' }),
    'color-1': z.string().min(1, { message: 'Select at least one color' }),
    goal: z.string().optional(),
    durability: z.string().optional(),
    infill: z.string().optional(),
    'material-2': z.string().min(1, { message: 'Select at least one material' }),
    'color-2': z.string().min(1, { message: 'Select at least one color' }),
    support: z.string().optional(),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      'print-name': "",
      description: "",
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
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  function CustomDropZone({
    onFileAccepted,
    initialFile,
  }: {
    onFileAccepted: (file: File | null) => void;
    initialFile?: File | undefined;
  }) {
    const [localFiles, setLocalFiles] = useState<File[] | undefined>(initialFile ? [initialFile] : undefined);

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
          const stl = acceptedFiles.find((f) => f.name.toLowerCase().endsWith('.stl')) ?? acceptedFiles[0];
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
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
              <div className="mt-2 text-sm text-muted-foreground">{(form.watch('file') as File).name}</div>
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
                <FormDescription>
                  Choose the strength level for the part.
                </FormDescription>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value ?? 'general-use'}>
                <div className="flex flex-col space-y-2 mt-2">
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
                <div className="flex flex-col space-y-2 mt-2">
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
        <div className="text-lg font-medium">Any preferred materials and colors for this print? (2 Choices)</div>
        <div className="text-sm text-muted-foreground">Some options may run out during busy seasons. Please select a priority (first choice) then a backup (second choice) option.</div>
      </div>

              <div>
                <FormLabel className="text-lg">First Choice:</FormLabel>
                <div className="mt-4 grid grid-cols-2 gap-4 items-start">
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
                          {MATERIAL_OPTIONS.filter((o) => o.value !== material2Watch).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
            <div className="mt-4 grid grid-cols-2 gap-4 items-start">
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
                          {MATERIAL_OPTIONS.filter((o) => o.value !== material1Watch).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                  <div className="flex items-center space-x-4 mt-2">
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
          <Button type="submit" size="sm" variant="default">
            Submit
          </Button>
        </div>
      </div>
      </form>
    </Form>
  );
}
