import JobList from './components/jobList';
import { jobApi } from '@/api/client/job';

export default async function PrintSubmissionHistory() {
  let fetchedJobs = [];

  try {
    const response = await jobApi.listAllJobs();
    
    fetchedJobs = (response as any).data?.data 
      ? (response as any).data.data 
      : (response as any).data || response;
      
    if (!Array.isArray(fetchedJobs)) {
      fetchedJobs = [];
    }
  } catch (error) {
    console.error('Failed to fetch print submission history:', error);
  }

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
      <JobList jobs={fetchedJobs} />
    </div>
  );
}