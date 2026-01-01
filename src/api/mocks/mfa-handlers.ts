import { http, HttpResponse } from 'msw';
import { generateErrorResponse, generateSuccessResponse } from './utils';
import { endpoints } from '../client/endpoints';
import { ErrorCodes } from '../client/errors';

const apiUrl = process.env.API_URL;

const VALID_OTP_CODE = '123456';
const MOCK_SESSION_TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_CHALLENGE_ID = 123;

export const mfaHandlers = [
  http.post(`${apiUrl}${endpoints.mfa.verifyEmail}`, async ({ request }) => {
    const { challengeId: _challengeId, code } = (await request.json()) as {
      challengeId: number;
      code: string;
    };

    console.log('MSW MFA: Verifying OTP code:', code, '- Valid:', code === VALID_OTP_CODE);

    // Accept only "123456" as valid OTP code
    if (code === VALID_OTP_CODE) {
      return HttpResponse.json(
        generateSuccessResponse({
          sessionToken: MOCK_SESSION_TOKEN,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': [
              `sessionToken=${MOCK_SESSION_TOKEN}; path=/; max-age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Strict`,
              `mfaToken=; path=/; max-age=0; HttpOnly; SameSite=Strict`,
            ].join(', '),
            'Access-Control-Allow-Credentials': 'true',
          },
        },
      );
    }

    // Reject any other code
    return HttpResponse.json(
      generateErrorResponse({
        code: ErrorCodes.INVALID_OTP,
        message: 'The OTP code is incorrect or has expired',
      }),
      { status: 401 },
    );
  }),

  http.post(
    `${apiUrl}/api/v1/mfa/email/challenge/:challengeId/resend`,
    async ({ params }) => {
      const { challengeId: _challengeId } = params;

      console.log('\n🔐 ========================================');
      console.log('📧 MSW: OTP Email Sent (Mock)');
      console.log('========================================');
      console.log('📝 OTP Code:', VALID_OTP_CODE);
      console.log('🆔 Challenge ID:', MOCK_CHALLENGE_ID);
      console.log('========================================\n');

      // Mock successful resend
      return HttpResponse.json(
        generateSuccessResponse({
          challengeId: MOCK_CHALLENGE_ID,
        }),
      );
    },
  ),
];
