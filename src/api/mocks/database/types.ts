export interface User {
  studentId: number;
  lastName: string;
  firstName: string;
  password: string;
  email: string;
  role: 'admin' | 'user';
  experience: string;
  createdDate?: string;
  trainingLevel?: string;
  experienceLevel?: string;
}

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
  | 'DRAFT'
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

export interface FileMetadata {
  id: string; // UUID
  filename: string;
  size: number; // bytes
  mimeType: string;
  uploadedAt: string; // ISO 8601
  uploadedBy: number; // User ID
  diskPath: string; // Internal: path on disk
}

export interface FileListItem {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: {
    studentId: number;
    firstName: string;
    lastName: string;
  };
}
