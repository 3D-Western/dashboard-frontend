// ---------------------------------------------------------------------------------------------
// Supervisor sign-off API (/api/v1/admin/training/signoffs). Shapes follow the "Sign-off API"
// section of docs/plans/training-v1.md. Needs the training:signoff permission.
// ---------------------------------------------------------------------------------------------

export type SignoffStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type SignoffChannel = 'DASHBOARD' | 'TEAMS' | 'MANUAL';

export interface SignoffChecklistItem {
  key: string;
  label: string;
}

/** What was stored with the decision: the label as the supervisor saw it, and whether it was ticked. */
export interface SignoffChecklistResult extends SignoffChecklistItem {
  checked: boolean;
}

export interface SignoffStudent {
  studentId: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface SignoffStaff {
  studentId: number;
  firstName: string | null;
  lastName: string | null;
}

/** One sign-off request: a queue row and the detail view have the same shape. */
export interface Signoff {
  id: number;
  status: SignoffStatus;
  requestedAt: string;
  /** When the student passed the online part. */
  onlinePassedAt: string;
  student: SignoffStudent;
  training: { id: number; slug: string; title: string; versionNo: number };
  attemptKind: 'FULL' | 'ADDON' | 'REFRESHER';
  checklist: SignoffChecklistItem[];
  /** True when the viewer is the student: nobody can sign themselves off. */
  ownRequest: boolean;
  decidedAt: string | null;
  decidedBy: SignoffStaff | null;
  channel: SignoffChannel | null;
  notes: string | null;
  checklistResult: SignoffChecklistResult[] | null;
}
