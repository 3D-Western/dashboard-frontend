import { endpoints } from '@/api/client/endpoints';

export interface OrderSubmissionData {
  name: string;
  description: string;
  material: string;
  file?: File;
}

export interface OrderSubmissionOptions {
  category: string;
  successRedirectPath?: string;
  errorMessagePrefix?: string;
}

export async function submitOrder(
  data: OrderSubmissionData,
  options: OrderSubmissionOptions,
  router: { push: (path: string) => void; refresh?: () => void },
) {
  const { file } = data;
  const {
    category,
    successRedirectPath = '/dashboard',
    errorMessagePrefix = 'Order submit failed',
  } = options;

  let fileId: string | null = null;

  // Mock file upload delay
  await new Promise((res) => setTimeout(res, 500));
  if (file) {
    fileId = `mock-${category.replace('-', '')}-file-${Date.now()}`;
  }

  const payload = {
    category,
    name: data.name,
    description: data.description,
    material: data.material,
    fileId: fileId || '',
    priority: 'standard',
    urgency: 'normal',
  };

  const submitRes = await fetch(endpoints.orders.create, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(text || errorMessagePrefix);
  }

  const result = await submitRes.json();
  console.log(`MOCK: Created ${category} order`, result.data?.order?.id);

  router.push(successRedirectPath);
  if (typeof router.refresh === 'function') {
    router.refresh();
  }
}
