'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CreateInvitationDialog } from './InvitationsTable/CreateInvitationDialog';
import { useRouter } from 'next/navigation';

export function CreateInvitationButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page to show the new invitation
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Invitation
      </Button>
      <CreateInvitationDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </>
  );
}
