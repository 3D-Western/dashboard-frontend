import { PrintJob } from '@/types/jobs';
import { DataTable } from './data-table';
import { columns } from './columns';

export interface PrintJobsTableProps {
  printJobs: PrintJob[];
}

export default function PrintJobsTable({ printJobs }: PrintJobsTableProps) {
  return (
    <div>
      <DataTable columns={columns} data={printJobs} />
    </div>
  );
}
