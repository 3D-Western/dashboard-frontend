export interface File {
  id: string;
  name: string;
  path: string;
}

export interface BasePrintJob {
  id: string;
  studentId: number;
  orderPlaced: string; // ISO date string
  description: string;
  name: string;
  reprint?: string | null; // link to another print job if this is a reprint
}

export type PrintJobStatus =
  | 'IN_QUEUE'
  | 'PRINTING'
  | 'READY'
  | 'FLAGGED'
  | 'ERROR'
  | 'SUCCESS'
  | 'FAIL';
export type CompletePrintJobStatus = 'SUCCESS' | 'FAIL';

export interface PrintJob extends BasePrintJob {
  kind: 'active-print-job'; // For type checking
  status: PrintJobStatus;
  stlFile: File;
}

export interface CompletedPrintJob extends BasePrintJob {
  kind: 'completed-print-job'; // For type checking
  orderFinished: string; // ISO date string
  status: CompletePrintJobStatus;
}
