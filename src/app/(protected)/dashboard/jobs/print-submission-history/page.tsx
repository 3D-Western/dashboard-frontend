// // 'use client';

// // import { useRouter } from 'next/navigation';
// // // tie to data
// // export default function PrintSubmissionHistory() {

// //   return (
// //     <h1>h</h1>
// //   );
// // }

// // page.tsx


'use client';

import JobList from './components/jobList';
import { mockJobs } from './mockData';

export default function PrintSubmissionHistory() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Print Submission History
        </h1>

        <p className="text-muted-foreground mt-2">
          View previously submitted fabrication jobs and their details.
        </p>
      </div>

      <JobList jobs={mockJobs} />
    </div>
  );
}