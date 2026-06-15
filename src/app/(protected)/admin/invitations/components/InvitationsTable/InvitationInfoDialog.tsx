'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Invitation } from '@/types/invitation';

interface InvitationInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitation: Invitation;
}

export function InvitationInfoDialog({
  open,
  onOpenChange,
  invitation,
}: InvitationInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invitation Details</DialogTitle>
          <DialogDescription>Additional information about this invitation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Created By</p>
            {invitation.createdBy ? (
              <p className="text-sm">
                {invitation.createdBy.firstName} {invitation.createdBy.lastName} (
                {invitation.createdBy.studentId})
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">-</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
