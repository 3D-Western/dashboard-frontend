'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IamPermission } from '@/types/iam';
import { sortPermissionsByGroup } from './utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  permissions: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export interface IamPermissionFormProps {
  allPermissions: IamPermission[];
  assignedPermissions: IamPermission[];
  onChange: (permissions: IamPermission[]) => void;
  onSubmit: (permissions: IamPermission[]) => void;
  onReset: () => void;
}

export function IamPermissionForm({
  allPermissions,
  assignedPermissions,
  onChange,
  onSubmit,
  onReset,
}: IamPermissionFormProps) {
  const assignedKeys = useMemo(() => assignedPermissions.map((p) => p.key), [assignedPermissions]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { permissions: assignedKeys },
  });

  // Sync form when assignedPermissions prop changes (e.g. after a successful save)
  useEffect(() => {
    form.reset({ permissions: assignedKeys });
  }, [assignedKeys, form]);

  // Notify parent of selection changes
  const selectedKeys = useWatch({
    control: form.control,
    name: 'permissions',
    defaultValue: assignedKeys,
  });

  useEffect(() => {
    onChange(allPermissions.filter((p) => selectedKeys.includes(p.key)));
  }, [selectedKeys, allPermissions, onChange]);

  const permissionGroups = useMemo(
    () => sortPermissionsByGroup(allPermissions, 'asc'),
    [allPermissions],
  );

  function handleSubmit(values: FormValues) {
    onSubmit(allPermissions.filter((p) => values.permissions.includes(p.key)));
  }

  function handleReset() {
    form.reset({ permissions: assignedKeys });
    onReset();
  }

  function toggleGroup(groupKeys: string[], checked: boolean) {
    const current = form.getValues('permissions');
    const activeGroupKeys = groupKeys.filter(
      (k) => allPermissions.find((p) => p.key === k)?.isActive,
    );
    const updated = checked
      ? Array.from(new Set([...current, ...activeGroupKeys]))
      : current.filter((k) => !groupKeys.includes(k));
    form.setValue('permissions', updated, { shouldDirty: true });
  }

  const { isDirty } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <Accordion
          type="multiple"
          defaultValue={permissionGroups.map((g) => g.prefix)}
          className="rounded-md border"
        >
          {permissionGroups.map((group) => {
            const groupKeys = group.permissions.map((p) => p.key);
            const activeCount = group.permissions.filter((p) => p.isActive).length;
            const selectedCount = groupKeys.filter((k) => selectedKeys.includes(k)).length;
            const allSelected = activeCount > 0 && selectedCount === activeCount;
            const someSelected = selectedCount > 0 && !allSelected;

            return (
              <AccordionItem key={group.prefix} value={group.prefix}>
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex flex-1 items-center gap-3">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                      onCheckedChange={(checked) => toggleGroup(groupKeys, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select all ${group.label} permissions`}
                    />
                    <span className="font-medium">{group.label}</span>
                    <Badge variant="secondary" className="mr-2 ml-auto">
                      {selectedCount} / {group.permissions.length}
                    </Badge>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4">
                  <div className="flex flex-col gap-1">
                    {group.permissions.map((permission) => (
                      <FormField
                        key={permission.key}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                            <FormControl>
                              <Checkbox
                                checked={field.value.includes(permission.key)}
                                disabled={!permission.isActive}
                                onCheckedChange={(checked) => {
                                  field.onChange(
                                    checked
                                      ? [...field.value, permission.key]
                                      : field.value.filter((k) => k !== permission.key),
                                  );
                                }}
                              />
                            </FormControl>
                            <div className="flex flex-1 flex-col gap-0.5">
                              <FormLabel className="flex cursor-pointer items-center gap-2 font-mono text-xs font-normal">
                                {permission.key}
                                {permission.isDangerous && (
                                  <Badge variant="destructive" className="px-1 py-0 text-[10px]">
                                    Dangerous
                                  </Badge>
                                )}
                                {!permission.isActive && (
                                  <Badge variant="outline" className="px-1 py-0 text-[10px]">
                                    Inactive
                                  </Badge>
                                )}
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleReset} disabled={!isDirty}>
            Reset
          </Button>
          <Button type="submit" disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
