'use client';

import { Button } from '@/components/ui/button';
import { PERMISSIONS } from '@/constants/permissions';
import type { IamGroup, IamRole } from '@/types/iam';
import type { User } from '@/types/user';
import { hasPermission } from '@/types/user';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateGroupDialog } from './groups/CreateGroupDialog';
import GroupsTable from './groups/GroupsTable';
import { CreateRoleDialog } from './roles/CreateRoleDialog';
import RolesTable from './roles/RolesTable';

type Tab = 'roles' | 'groups';

interface IamTabsProps {
  initialRoles: IamRole[];
  initialGroups: IamGroup[];
  currentUser: User;
}

export function IamTabs({ initialRoles, initialGroups, currentUser }: IamTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('roles');
  const [roles, setRoles] = useState<IamRole[]>(initialRoles);
  const [groups, setGroups] = useState<IamGroup[]>(initialGroups);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const canCreateRoles = hasPermission(currentUser, PERMISSIONS.IAM_ASSIGN_ROLES);
  const canCreateGroups = hasPermission(currentUser, PERMISSIONS.IAM_MANAGE_GROUPS);

  const handleRoleCreated = (role: IamRole) => {
    setRoles((prev) => [role, ...prev]);
  };

  const handleGroupCreated = (group: IamGroup) => {
    setGroups((prev) => [group, ...prev]);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'roles', label: 'Roles' },
    { id: 'groups', label: 'Groups' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors hover:text-foreground ${
              activeTab === tab.id
                ? 'text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground'
                : 'text-muted-foreground'
            }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'roles' && (
        <RolesTable
          roles={roles}
          toolbar={
            canCreateRoles && (
              <Button size="sm" onClick={() => setShowCreateRole(true)}>
                <Plus  />
                Create Role
              </Button>
            )
          }
        />
      )}

      {activeTab === 'groups' && (
        <GroupsTable
          groups={groups}
          allRoles={roles.filter((r) => r.isActive)}
          toolbar={
            canCreateGroups && (
              <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                <Plus />
                Create Group
              </Button>
            )
          }
        />
      )}

      <CreateRoleDialog
        open={showCreateRole}
        onOpenChange={setShowCreateRole}
        onSuccess={handleRoleCreated}
      />

      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        onSuccess={handleGroupCreated}
      />
    </div>
  );
}
