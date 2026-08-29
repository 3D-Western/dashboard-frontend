import { describe, it, expect } from 'vitest';
import db from './db';
import { OnboardingAnswers } from '@/types/onboarding';

const sampleAnswers: OnboardingAnswers = {
  affiliation: 'undergraduate',
  faculty: 'engineering',
  program: 'Software Engineering',
  year: 'year_2',
  interests: ['making_and_fabrication'],
  equipmentInterested: ['three_d_printers'],
  equipmentUsedBefore: [],
  hearAboutUs: 'friend',
  signupMotivation: 'personal_project',
  communicationPreferences: ['workshops_and_events'],
  agreedToTerms: true,
  agreedToPrivacyPolicy: true,
  agreedToSafetyTraining: true,
};

describe('Database onboarding methods', () => {
  it('returns false for a user who has not completed onboarding', () => {
    expect(db.getOnboardingStatus(251000002)).toBe(false);
  });

  it('marks onboarding complete and persists the answers', () => {
    const updated = db.completeOnboarding(251000002, sampleAnswers);

    expect(updated?.onboardingCompleted).toBe(true);
    expect(updated?.onboardingAnswers).toEqual(sampleAnswers);
    expect(db.getOnboardingStatus(251000002)).toBe(true);
  });

  it('returns null when completing onboarding for a nonexistent user', () => {
    expect(db.completeOnboarding(999999999, sampleAnswers)).toBeNull();
  });

  it('returns false for onboarding status of a nonexistent user', () => {
    expect(db.getOnboardingStatus(999999999)).toBe(false);
  });
});
