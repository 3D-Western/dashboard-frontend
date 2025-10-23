// Update elevate-app/src/api/mocks/utils.ts
// Fix invalidSessionResponse for Safari

import { HttpResponse } from 'msw';
import { ErrorCodes } from '../client/errors';
import { ApiResponseError } from '../types';

export const generateSuccessResponse = (data: unknown) => {
  return {
    success: true,
    data,
  };
};

export const generateErrorResponse = (error: ApiResponseError) => {
  return {
    success: false,
    error,
  };
};

// Debug handler middleware
export const debugRequest = async (req: Request) => {
  console.log('\n=== MSW Request Debug ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);

  // Log headers
  console.log('\nHeaders:');
  for (const [key, value] of req.headers.entries()) {
    console.log(`${key}: ${value}`);
  }

  // Log body
  try {
    const clonedReq = req.clone(); // Clone request as body can only be read once
    const body = await clonedReq.text();
    console.log('\nBody (raw):', body);

    if (body) {
      try {
        const jsonBody = JSON.parse(body);
        console.log('Body (parsed):', JSON.stringify(jsonBody, null, 2));
      } catch {
        console.log('Body is not JSON:', body);
      }
    } else {
      console.log('No body content');
    }
  } catch (e) {
    console.log('Error reading body:', e);
  }

  console.log('\n=== End Debug ===\n');
};

/**
 * Creates a new invalid session response
 * Note: This must be a function that returns a new HttpResponse each time,
 * because HttpResponse streams can only be read once (ReadableStream limitation)
 */
export const createInvalidSessionResponse = () =>
  new HttpResponse(
    JSON.stringify(
      generateErrorResponse({
        code: ErrorCodes.SESSION_INVALID,
        message: 'Invalid session',
      }),
    ),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `sessionToken=; path=/; max-age=0; SameSite=Strict`, // Remove the invalid cookie
      },
    },
  );
