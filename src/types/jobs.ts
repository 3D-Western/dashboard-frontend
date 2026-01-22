export interface File {
  id: string;
  name: string;
  path: string;
}

export interface StudentInfo {
  studentId: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface BasePrintJob {
  id: string;
  studentId: number;
  student?: StudentInfo; // Populated for admin views
  orderPlaced: string; // ISO date string
  description: string;
  name: string;
  reprint?: string | null; // link to another print job if this is a reprint
}

export type PrintJobStatus =
  | 'InQueue'
  | 'Printing'
  | 'Ready'
  | 'Flagged'
  | 'Error'
  | 'Succeeded'
  | 'Failed'
  | 'PendingFile';
export type CompletePrintJobStatus = 'Succeeded' | 'Failed';

export interface PrintJob extends BasePrintJob {
  kind: 'active-print-job'; // For type checking
  status: PrintJobStatus;
}

export interface CompletedPrintJob extends BasePrintJob {
  kind: 'completed-print-job'; // For type checking
  orderFinished: string; // ISO date string
  status: CompletePrintJobStatus;
}
