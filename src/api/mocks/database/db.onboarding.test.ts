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
  it('returns false for a freshly signed-up user who has not completed onboarding', () => {
    const created = db.createUser({
      studentId: 251500001,
      email: 'onboarding-pending@uwo.ca',
      password: 'password',
      firstName: 'Pending',
      lastName: 'User',
    });
    if (created === 'DUPLICATE_STUDENT_ID' || created === 'DUPLICATE_EMAIL') {
      throw new Error('unexpected duplicate in test setup');
    }

    expect(db.getOnboardingStatus(created.studentId)).toBe(false);
  });

  it('treats a seeded pre-existing user (no onboardingCompleted field set) as already onboarded, matching the emailVerified convention (regression: seeded accounts must not be sent through onboarding)', () => {
    expect(db.getOnboardingStatus(251000002)).toBe(true);
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
});
