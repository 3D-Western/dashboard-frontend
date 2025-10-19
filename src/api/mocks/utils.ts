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

// Updated for Safari compatibility
export const invalidSessionResponse = new HttpResponse(
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

/**
 * Creates a deep copy of an object or array
 * Handles circular references and various JavaScript types
 * @param obj - The object to deep copy
 * @returns A deep copy of the input
 */
export function deepCopy<T>(obj: T): T {
  // Handle null, undefined, and primitive types
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  // Handle RegExp objects
  if (obj instanceof RegExp) {
    return new RegExp(obj) as unknown as T;
  }

  // Handle Map objects
  if (obj instanceof Map) {
    const copy = new Map();
    (obj as Map<unknown, unknown>).forEach((value, key) => {
      copy.set(deepCopy(key), deepCopy(value));
    });
    return copy as unknown as T;
  }

  // Handle Set objects
  if (obj instanceof Set) {
    const copy = new Set();
    (obj as Set<unknown>).forEach((value) => {
      copy.add(deepCopy(value));
    });
    return copy as unknown as T;
  }

  // Handle Array objects
  if (Array.isArray(obj)) {
    return obj.map((item) => deepCopy(item)) as unknown as T;
  }

  // Handle circular references with a WeakMap
  const references = new WeakMap();

  function deepCopyObject<U>(obj: U): U {
    // Check for circular reference
    if (references.has(obj as object)) {
      return references.get(obj as object);
    }

    // Create a new empty object with the same prototype
    const copy = Object.create(Object.getPrototypeOf(obj));

    // Store reference to avoid circular reference issues
    references.set(obj as object, copy);

    // Copy all enumerable properties
    Object.entries(obj as object).forEach(([key, value]) => {
      copy[key] = deepCopy(value);
    });

    return copy;
  }

  return deepCopyObject(obj);
}
