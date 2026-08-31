import { endpoints } from '@/api/client/endpoints';
import { JobCategory } from '@/types/jobs';

export interface JobSubmissionData {
  name: string;
  description: string;
  purpose?: string;
  material: string;
  file?: File;
}

export interface JobSubmissionOptions {
  category: 'cnc' | 'water-jet' | 'laser-cutting' | '3d-print';
  successRedirectPath?: string;
  errorMessagePrefix?: string;
}

const toBackendCategory = (category: JobSubmissionOptions['category']): JobCategory => {
  switch (category) {
    case 'cnc':
      return 'CNC';
    case 'water-jet':
      return 'Waterjet';
    case 'laser-cutting':
      return 'LaserCutting';
    case '3d-print':
      return 'ThreeDPrint';
    default: {
      // Exhaustive check - TypeScript will error if a new category is added
      const _exhaustive: never = category;
      throw new Error(`Unknown category: ${_exhaustive}`);
    }
  }
};

export async function submitJob(
  data: JobSubmissionData,
  options: JobSubmissionOptions,
  router: { push: (path: string) => void; refresh?: () => void },
) {
  const { file } = data;
  const {
    category,
    successRedirectPath = '/dashboard',
    errorMessagePrefix = 'Job submit failed',
  } = options;

  let fileId: string | null = null;

  // Mock file upload delay
  await new Promise((res) => setTimeout(res, 500));
  if (file) {
    fileId = `mock-${category.replace('-', '')}-file-${Date.now()}`;
  }

  const payload = {
    category: toBackendCategory(category),
    jobName: data.name,
    description: data.description,
    formAnswerJson: JSON.stringify({
      material: data.material,
      purpose: data.purpose || '',
      fileId: fileId || '',
      priority: 'standard',
      urgency: 'normal',
    }),
  };

  const submitRes = await fetch(endpoints.jobs.create, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(text || errorMessagePrefix);
  }

  const result = await submitRes.json();
  console.log(`MOCK: Created ${category} job`, result.data?.jobId);

  router.push(successRedirectPath);
  if (typeof router.refresh === 'function') {
    router.refresh();
  }
}
