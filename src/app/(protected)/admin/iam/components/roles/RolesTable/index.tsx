'use client';

import type { IamRole } from '@/types/iam';
import { useMemo, useState } from 'react';
import { IamDataTable } from '../../IamDataTable';
import { useColumns } from './useColumns';

interface RolesTableProps {
  roles: IamRole[];
  toolbar?: React.ReactNode;
}

export default function RolesTable({ roles, toolbar }: RolesTableProps) {
  const [roleOverrides, setRoleOverrides] = useState<Map<number, Partial<IamRole>>>(new Map());

  const data = useMemo(
    () =>
      roles.map((role) => {
        const override = roleOverrides.get(role.id);
        return override ? { ...role, ...override } : role;
      }),
    [roles, roleOverrides],
  );

  const handleStatusChange = (roleId: number, isActive: boolean) => {
    setRoleOverrides((prev) => new Map(prev).set(roleId, { isActive }));
  };

  const columns = useColumns({ onStatusChange: handleStatusChange });

  return (
    <IamDataTable
      columns={columns}
      data={data}
      searchPlaceholder="Search roles..."
      tableLabel="Roles table"
      tableCaption="IAM roles with their permissions and status. Sortable by name and creation date."
      toolbar={toolbar}
      emptyMessage="No roles found."
    />
  );
}
