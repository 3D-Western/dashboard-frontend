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
  files: File[];
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
  status: PrintJobStatus | CompletePrintJobStatus;
  comments: string;
}

export interface ETA extends JobDetail{
  // USES DATE Submitted from job detail 
  // need to find a way to get print times, how long job takes

}
export interface StatusHistory extends JobDetail {

//date of status update change but not sure how to get that info
//  date 

}

export interface Pickup extends CompletedPrintJob{
  location: string;
  hours: number;
  instructions: string;
}