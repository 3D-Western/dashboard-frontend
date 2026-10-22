'use client';

import Link from 'next/link';
import { FileBox } from 'lucide-react';
import { useLocalTime } from '@/hooks/useLocalTime';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { JobDetail } from '@/types/jobs';
import { getPrintSpecs } from './PrintSpecifications';

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn(wide && 'sm:col-span-2')}>
      <dt className="eyebrow text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm break-words">{children}</dd>
    </div>
  );
}

/** Everything the user entered for the job; the same layout for every status. */
export function JobInfo({ job, className }: { job: JobDetail; className?: string }) {
  const createdSource = job.dateSubmitted || job.jobPlaced;
  const createdAt = useLocalTime(createdSource, 'MMM d, yyyy, h:mm a');
  const specs = getPrintSpecs(job.formAnswersJson);
  // The file list is the reliable source; older records may only have the storage path
  const fileName = job.files?.[0]?.name || job.filepath?.split('/').pop();

  return (
    <section
      aria-labelledby="job-info-heading"
      className={cn('rounded-lg border bg-card', className)}
    >
      <h2 id="job-info-heading" className="border-b px-5 py-3 text-base">
        Job details
      </h2>
      <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2">
        <Field label="Description" wide>
          {job.description || <span className="text-muted-foreground">No description</span>}
        </Field>
        <Field label="File">
          {fileName ? (
            <span className="inline-flex items-center gap-1.5">
              <FileBox className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {fileName}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {job.status === 'PendingFile' ? 'Not uploaded yet' : 'Not available'}
            </span>
          )}
        </Field>
        {/* A job with no date at all (old or incomplete records) leaves the row out, not blank */}
        {createdSource && createdAt && (
          <Field label="Created">
            <time dateTime={createdSource}>{createdAt}</time>
          </Field>
        )}
        {specs.map((spec) => (
          <Field key={spec.label} label={spec.label}>
            {spec.value}
          </Field>
        ))}
        {job.reprint && (
          <Field label="Printed again from">
            <Link
              href={Routes.jobs.detail(job.reprint)}
              className="text-primary underline-offset-4 hover:underline"
            >
              View original job
            </Link>
          </Field>
        )}
        <Field label="Job ID">
          <span className="font-mono text-sm break-all text-muted-foreground">{job.id}</span>
        </Field>
        {job.comments && (
          <Field label="Comments" wide>
            {job.comments}
          </Field>
        )}
      </dl>
    </section>
  );
}
