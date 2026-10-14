import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WEBSITE_PROJECTS_URL } from '@/constants/website';
import { EmailUsButton } from './EmailUsButton';

/**
 * Invites users with a finished print to have their project featured on the website's projects
 * page. There's no submission form yet, so "Submit project" helps them email the club.
 */
export function FeatureProjectCta({ jobName, jobId }: { jobName: string; jobId: string }) {
  const subject = `Project feature submission: ${jobName}`;
  const body = `Hi 3D Western,\n\nI'd like my project "${jobName}" (job ${jobId}) to be considered for the projects page.\n\nWhat it is:\n\nWho made it:\n\nPhotos (attach a few):\n`;

  return (
    <section
      aria-labelledby="feature-project-heading"
      className="flex flex-col gap-4 rounded-lg border border-purple-light/40 bg-purple-light/5 p-5 sm:flex-row sm:items-center"
    >
      <Sparkles className="hidden size-8 shrink-0 text-purple-light sm:block" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="feature-project-heading" className="text-lg">
          Get your project featured
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Proud of what you made? Send it in and it could be featured on the 3D Western projects
          page.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="lg" className="px-4">
          <a href={WEBSITE_PROJECTS_URL} target="_blank" rel="noopener noreferrer">
            See projects
          </a>
        </Button>
        <EmailUsButton
          label="Submit project"
          variant="default"
          className="px-4"
          subject={subject}
          body={body}
        />
      </div>
    </section>
  );
}
