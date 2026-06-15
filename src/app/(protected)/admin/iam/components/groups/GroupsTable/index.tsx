'use client';

import type { IamGroup, IamRole } from '@/types/iam';
import { useMemo, useState } from 'react';
import { IamDataTable } from '../../IamDataTable';
import { useColumns } from './useColumns';

interface GroupsTableProps {
  groups: IamGroup[];
  allRoles: IamRole[];
  toolbar?: React.ReactNode;
}

export default function GroupsTable({ groups, allRoles, toolbar }: GroupsTableProps) {
  const [groupOverrides, setGroupOverrides] = useState<Map<number, Partial<IamGroup>>>(new Map());

  const data = useMemo(
    () =>
      groups.map((group) => {
        const override = groupOverrides.get(group.id);
        return override ? { ...group, ...override } : group;
      }),
    [groups, groupOverrides],
  );

  const handleStatusChange = (groupId: number, isActive: boolean) => {
    setGroupOverrides((prev) => new Map(prev).set(groupId, { isActive }));
  };

  const columns = useColumns({ allRoles, onStatusChange: handleStatusChange });

  return (
    <IamDataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search groups..."
      tableLabel="Groups table"
      tableCaption="IAM groups with their assigned roles and status. Sortable by name and creation date."
      toolbar={toolbar}
      emptyMessage="No groups found."
    />
  );
}
