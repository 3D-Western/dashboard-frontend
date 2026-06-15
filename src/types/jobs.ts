export interface File {
  id: string;
  name: string;
  path: string;
}

export interface UserInfo {
  studentId: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export type JobCategory = 'ThreeDPrint' | 'CNC' | 'Waterjet' | 'LaserCutting';

export interface BasePrintJob {
  id: string;
  user: UserInfo;
  jobPlaced: string; // ISO date string
  category: JobCategory;
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
  jobFinished: string; // ISO date string
  status: CompletePrintJobStatus;
}

export interface JobDetail extends BasePrintJob {
  dateSubmitted: string;
  status: PrintJobStatus;
  comments: string;
  filepath: string;
  formAnswersJson: string;
  pickupDetails?: Pickup;
  jobETA?: ETA;
  statusHistory?: StatusHistory[];


}

export interface ETA {
  estimatedCompletionTime: string; // ISO Date
  updatedAt: string;               
}


export interface StatusHistory{
  status: PrintJobStatus;
  changedAt: string; // ISO Date String
// if the status gets changed to error or failed from admin side they can put it here. may not be used but creating in the type and mocks for now
  comments?: string; 


}

export interface Pickup {
  location: string;
  hours: string;
  instructions: string;
}
