'use client';

import { Button } from '@/components/ui/button';
import type { IamRole } from '@/types/iam';
import { Info, Users } from 'lucide-react';
import { useState } from 'react';
import { RolePermissionsSheet } from '../roles/RolePermissionsSheet';

interface DefaultPermissionsCardProps {
  memberRole: IamRole | undefined;
}

export function DefaultPermissionsCard({ memberRole }: DefaultPermissionsCardProps) {
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Default member permissions</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every registered user automatically inherits the{' '}
            <code className="rounded bg-muted px-1 py-0.5">{memberRole?.name ?? 'Member'}</code>{' '}
            role. This is a system default and cannot be changed through the UI.
          </p>
        </div>
        {memberRole && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-xs"
            onClick={() => setShowSheet(true)}
          >
            <Info className="h-3.5 w-3.5" />
            View permissions
          </Button>
        )}
      </div>

      {memberRole && (
        <RolePermissionsSheet
          role={memberRole}
          open={showSheet}
          onOpenChange={setShowSheet}
        />
      )}
    </>
  );
}
