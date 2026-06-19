'use client';

import { Button } from '@/components/ui/button';
import { HIDDEN_GROUP_KEYS, LOCKED_ROLE_KEYS, PERMISSIONS } from '@/constants/permissions';
import type { IamGroup, IamRole } from '@/types/iam';
import type { User } from '@/types/user';
import { hasPermission } from '@/types/user';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DefaultPermissionsCard } from './groups/DefaultPermissionsCard';
import { CreateGroupDialog } from './groups/CreateGroupDialog';
import GroupsTable from './groups/GroupsTable';
import { IamHelpDialog } from './IamHelpDialog';
import { CreateRoleDialog } from './roles/CreateRoleDialog';
import RolesTable from './roles/RolesTable';

type Tab = 'roles' | 'groups';

interface IamTabsProps {
  initialRoles: IamRole[];
  initialGroups: IamGroup[];
  currentUser: User;
}

export function IamTabs({ initialRoles, initialGroups, currentUser }: IamTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('groups');
  const [roles, setRoles] = useState<IamRole[]>(initialRoles);
  const [groups, setGroups] = useState<IamGroup[]>(initialGroups);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const canCreateRoles = hasPermission(currentUser, PERMISSIONS.IAM_ASSIGN_ROLES);
  const canCreateGroups = hasPermission(currentUser, PERMISSIONS.IAM_MANAGE_GROUPS);

  const visibleGroups = useMemo(
    () => groups.filter((g) => !(HIDDEN_GROUP_KEYS as readonly string[]).includes(g.groupKey)),
    [groups],
  );

  const memberRole = useMemo(() => roles.find((r) => r.roleKey === LOCKED_ROLE_KEYS[1]), [roles]);

  const handleRoleCreated = (role: IamRole) => {
    setRoles((prev) => [role, ...prev]);
  };

  const handleGroupCreated = (group: IamGroup) => {
    setGroups((prev) => [group, ...prev]);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'groups', label: 'Groups' },
    { id: 'roles', label: 'Roles' },
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
        <div className="ml-auto pb-1">
          <IamHelpDialog />
        </div>
      </div>

      {activeTab === 'roles' && (
        <RolesTable
          roles={roles}
          toolbar={
            canCreateRoles && (
              <Button size="sm" onClick={() => setShowCreateRole(true)}>
                <Plus />
                Create Role
              </Button>
            )
          }
        />
      )}

      {activeTab === 'groups' && (
        <div className="space-y-4">
          <DefaultPermissionsCard memberRole={memberRole} />
          <GroupsTable
            groups={visibleGroups}
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
        </div>
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
