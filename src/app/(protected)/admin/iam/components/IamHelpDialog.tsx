'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HelpCircle, KeyRound, Shield, Users } from 'lucide-react';
import { useState } from 'react';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-1.5 pl-6 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
        {number}
      </span>
      <p className="leading-5">{children}</p>
    </div>
  );
}

export function IamHelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="IAM help">
        <HelpCircle className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>IAM Management Guide</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {/* Overview */}
              <p className="text-sm text-muted-foreground">
                The IAM system controls what users can do.{' '}
                <strong className="text-foreground">Roles</strong> hold permissions,{' '}
                <strong className="text-foreground">Groups</strong> bundle users together and
                inherit permissions from their assigned roles.
              </p>

              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">How it works</p>
                <p className="mt-1 text-muted-foreground">
                  User → Group → Role → Permissions. Adding a user to a group automatically grants
                  them all permissions from the group&apos;s roles.
                </p>
              </div>

              {/* Roles */}
              <Section icon={<Shield className="h-4 w-4" />} title="Roles">
                <p className="mb-2">
                  Roles are named permission sets. Create one role per job function (e.g.{' '}
                  <Badge variant="outline" className="font-mono text-xs">
                    print_operator
                  </Badge>
                  ).
                </p>

                <p className="mb-1 font-medium text-foreground">Create a role</p>
                <div className="space-y-1">
                  <Step number={1}>Go to the Roles tab and click Create Role.</Step>
                  <Step number={2}>
                    Enter a unique key using lowercase letters and underscores only (e.g.{' '}
                    <code className="rounded bg-muted px-1 text-foreground">print_operator</code>).
                  </Step>
                  <Step number={3}>Add a name and an optional description, then click Create.</Step>
                </div>

                <p className="mt-3 mb-1 font-medium text-foreground">
                  Assign permissions to a role
                </p>
                <div className="space-y-1">
                  <Step number={1}>
                    In the Roles table, open the actions menu (⋯) and select View Permissions.
                  </Step>
                  <Step number={2}>
                    Click <strong className="text-foreground">Edit Permissions</strong>, then toggle
                    the permissions you want to grant.
                  </Step>
                  <Step number={3}>
                    Click <strong className="text-foreground">Save Changes</strong>. Changes apply
                    to all groups using this role immediately.
                  </Step>
                </div>

                <p className="mt-2 text-xs">
                  Permissions marked with{' '}
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    ⚠ Dangerous
                  </span>{' '}
                  grant elevated access — assign them carefully.
                </p>
              </Section>

              {/* Groups */}
              <Section icon={<Users className="h-4 w-4" />} title="Groups">
                <p className="mb-2">
                  Groups organise users and define what they can do via assigned roles.
                </p>

                <p className="mb-1 font-medium text-foreground">Create a group</p>
                <div className="space-y-1">
                  <Step number={1}>Go to the Groups tab and click Create Group.</Step>
                  <Step number={2}>
                    Enter a unique key, name, and optional description, then click Create.
                  </Step>
                </div>

                <p className="mt-3 mb-1 font-medium text-foreground">Assign roles to a group</p>
                <div className="space-y-1">
                  <Step number={1}>
                    In the Groups table, open the actions menu (⋯) and select View Roles.
                  </Step>
                  <Step number={2}>
                    Click <strong className="text-foreground">Edit Roles</strong>, check the roles
                    to assign, then click <strong className="text-foreground">Save Changes</strong>.
                  </Step>
                </div>

                <p className="mt-3 mb-1 font-medium text-foreground">Add members to a group</p>
                <div className="space-y-1">
                  <Step number={1}>Open the actions menu (⋯) and select Manage Members.</Step>
                  <Step number={2}>
                    Click Add Member, then search by name, email, or student ID and click Add next
                    to the user.
                  </Step>
                  <Step number={3}>
                    To remove a member, click Remove next to their name in the members list.
                  </Step>
                </div>
              </Section>

              {/* Keys */}
              <Section icon={<KeyRound className="h-4 w-4" />} title="Keys">
                <p>
                  Keys are permanent identifiers used by the system. They cannot be changed after
                  creation — choose them carefully. Use lowercase letters, numbers, and underscores
                  only (e.g.{' '}
                  <code className="rounded bg-muted px-1 text-foreground">admin_group</code>).
                </p>
              </Section>

              {/* System items */}
              <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">System roles & groups</p>
                <p className="mt-1 text-muted-foreground">
                  Items marked{' '}
                  <Badge variant="secondary" className="text-xs">
                    System
                  </Badge>{' '}
                  are built-in and cannot be deactivated or deleted. Their permissions can still be
                  viewed.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
