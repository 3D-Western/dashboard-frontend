'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import { AddNonWesternMemberDialog } from './AddNonWesternMemberDialog';
import { useRouter } from 'next/navigation';

/** The "Add a non-Western member" action in User Management. */
export function AddNonWesternMemberButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page so the new invitation shows up in the Invitations tab
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Add a non-Western member
      </Button>
      <AddNonWesternMemberDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </>
  );
}
