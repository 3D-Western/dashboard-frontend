'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { jobApi } from '@/api/client/job';
import { Button } from '@/components/ui/button';
import { useLocalTime } from '@/hooks/useLocalTime';
import { calculateFileChecksum } from '@/lib/file-utils';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { JobDetail, PrintJobStatus, StatusHistory } from '@/types/jobs';
import { JOB_STAGES, TONE_CLASSES } from '../../lib/job-stages';
import { PrintProgress } from '../../components/PrintProgress';
import { EmailUsButton } from './EmailUsButton';

const latestEntry = (history: StatusHistory[] | undefined, status: PrintJobStatus) =>
  history ? [...history].reverse().find((entry) => entry.status === status) : undefined;

function LocalTime({ date }: { date: string }) {
  const time = useLocalTime(date, 'EEE, MMM d, h:mm a');
  return <time dateTime={date}>{time}</time>;
}

function RetryUploadButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    try {
      const { presignedUrl } = await jobApi.retryUpload(jobId);
      await jobApi.uploadJobFile(presignedUrl, file);
      const checksum = await calculateFileChecksum(file);
      await jobApi.completeUpload(jobId, {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/sla',
        checksum,
      });
      toast.success('File uploaded', { description: 'Your job has been submitted.' });
      router.refresh();
    } catch (error) {
      console.error('Failed to retry upload:', error);
      toast.error('Failed to upload file', {
        description: error instanceof Error ? error.message : 'An error occurred while uploading',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl"
        className="hidden"
        onChange={handleFileSelected}
        aria-label="STL file to upload"
      />
      <Button
        size="lg"
        className="px-4"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
        {isUploading ? 'Uploading...' : 'Upload STL file'}
      </Button>
    </>
  );
}

function Reason({ entry, fallback }: { entry?: StatusHistory; fallback: string }) {
  return (
    <div className="mt-3 rounded-md border bg-background/60 px-4 py-3">
      <p className="eyebrow text-[11px] text-muted-foreground">Reason</p>
      <p className="mt-1 text-sm">{entry?.comments || fallback}</p>
    </div>
  );
}

/** What's happening with the job right now and what the user can do about it. */
export function StagePanel({ job }: { job: JobDetail }) {
  const stage = JOB_STAGES[job.status];
  const tone = TONE_CLASSES[stage?.tone ?? 'gray'];
  const eta = job.jobETA?.estimatedCompletionTime;
  const contactSubject = `Question about my job: ${job.name}`;

  let title: string;
  let content: React.ReactNode = null;

  switch (job.status) {
    case 'PendingFile':
      title = 'Upload your file to submit this job';
      content = (
        <>
          <p>Your STL file didn&apos;t finish uploading, so this job hasn&apos;t been submitted.</p>
          <div className="mt-4">
            <RetryUploadButton jobId={job.id} />
          </div>
        </>
      );
      break;
    case 'InQueue':
      title = 'Waiting for a printer';
      content = (
        <>
          <p>Your job is in the queue and will start printing when a printer is free.</p>
          {eta && (
            <p className="mt-2">
              Estimated completion: <LocalTime date={eta} />
            </p>
          )}
        </>
      );
      break;
    case 'Printing':
      title = 'Printing now';
      content = (
        <>
          <p>Your design is on the printer.</p>
          <PrintProgress
            className="mt-4 max-w-md"
            barClassName="flex-1"
            startedAt={latestEntry(job.statusHistory, 'Printing')?.changedAt}
            estimatedCompletion={eta}
          />
          {eta && (
            <p className="mt-2 text-xs">
              Estimated finish: <LocalTime date={eta} />
            </p>
          )}
        </>
      );
      break;
    case 'Ready':
      title = 'Ready for pickup';
      content = job.pickupDetails ? (
        <dl className="mt-1 grid gap-4 sm:grid-cols-3">
          {(
            [
              ['Where', job.pickupDetails.location],
              ['When', job.pickupDetails.hours],
              ['Bring', job.pickupDetails.instructions],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="eyebrow text-[11px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <>
          <p>Your print is done. Contact us to arrange pickup.</p>
          <div className="mt-3">
            <EmailUsButton label="Contact us" subject={contactSubject} className="px-4" />
          </div>
        </>
      );
      break;
    case 'Succeeded':
      title = 'Completed';
      content = <p>Your print is finished. Thanks for printing with 3D Western!</p>;
      break;
    case 'Flagged':
      title = 'Your job was declined';
      content = (
        <>
          <Reason
            entry={latestEntry(job.statusHistory, 'Flagged')}
            fallback="No reason was given. Contact us if you have questions."
          />
          <p className="mt-3">Fix the issue in your design, then submit it as a new job.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="lg" className="px-4">
              <Link href={Routes.jobs.newPrintJob}>Start a new job</Link>
            </Button>
            <EmailUsButton
              label="Ask about this decision"
              subject={contactSubject}
              className="px-4"
            />
          </div>
        </>
      );
      break;
    case 'Failed':
      title = 'The print failed';
      content = (
        <>
          <Reason
            entry={latestEntry(job.statusHistory, 'Failed')}
            fallback="Something went wrong on the printer."
          />
          <p className="mt-3">
            Use &ldquo;Print again&rdquo; in the &#8943; menu to resubmit the same file, or contact
            us if you&apos;re not sure what happened.
          </p>
        </>
      );
      break;
    case 'Error':
      title = 'Something went wrong';
      content = (
        <Reason
          entry={latestEntry(job.statusHistory, 'Error')}
          fallback="There was a problem with this job. Contact us if it doesn't clear up."
        />
      );
      break;
    case 'Cancelled':
      title = 'This job was cancelled';
      content = <p>It won&apos;t be printed.</p>;
      break;
    default:
      title = stage?.label ?? job.status;
  }

  return (
    <section
      aria-labelledby="stage-heading"
      className={cn('relative overflow-hidden rounded-lg border p-5 pl-6', tone.tint)}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} />
      <p className={cn('eyebrow text-[11px]', tone.text)}>Current stage</p>
      <h2 id="stage-heading" className="mt-1 text-xl">
        {title}
      </h2>
      {content && <div className="mt-2 text-sm text-muted-foreground">{content}</div>}
    </section>
  );
}
