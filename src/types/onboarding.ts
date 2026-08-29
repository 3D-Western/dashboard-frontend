import type { Affiliation } from '@/constants/affiliation';

export interface OnboardingAnswers {
  affiliation: Affiliation;

  // Conditional fields, requiredness enforced per-affiliation at the form's validation layer
  faculty?: string;
  program?: string;
  year?: string;
  degreeLevel?: string;
  department?: string;

  interests: string[];
  equipmentInterested: string[];
  equipmentUsedBefore: string[];

  hearAboutUs: string;
  signupMotivation: string;

  communicationPreferences: string[];

  agreedToTerms: boolean;
  agreedToPrivacyPolicy: boolean;
  agreedToSafetyTraining: boolean;
}
