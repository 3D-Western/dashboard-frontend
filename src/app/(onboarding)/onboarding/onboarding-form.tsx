'use client';

import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { CheckboxGroupField } from '@/components/CheckboxGroupField';
import { EquipmentInterestGrid } from '@/components/EquipmentInterestGrid';

import { AFFILIATIONS, AFFILIATION_OPTIONS } from '@/constants/affiliation';
import { FACULTY_OPTIONS } from '@/constants/faculties';
import { PROGRAM_YEAR_OPTIONS } from '@/constants/program-year';
import { DEGREE_LEVEL_OPTIONS } from '@/constants/degree-level';
import { INTEREST_OPTIONS } from '@/constants/interests';
import { EQUIPMENT_INTEREST_OPTIONS } from '@/constants/equipment-interests';
import { REFERRAL_SOURCES, REFERRAL_SOURCE_OPTIONS } from '@/constants/referral-source';
import { SIGNUP_MOTIVATIONS, SIGNUP_MOTIVATION_OPTIONS } from '@/constants/signup-motivation';
import { COMMUNICATION_PREFERENCE_OPTIONS } from '@/constants/communication-preferences';

import { useOnboardingStatus } from '@/hooks/useOnboarding';
import { Routes } from '@/lib/routes';

const onboardingBaseSchema = z.object({
  affiliation: z.enum([
    AFFILIATIONS.UNDERGRADUATE,
    AFFILIATIONS.GRADUATE,
    AFFILIATIONS.STAFF,
    AFFILIATIONS.ALUMNI,
    AFFILIATIONS.COMMUNITY_MEMBER,
    AFFILIATIONS.OTHER,
  ]),

  faculty: z.string().optional(),
  program: z.string().optional(),
  year: z.string().optional(),
  degreeLevel: z.string().optional(),
  department: z.string().optional(),

  interests: z.array(z.string()).min(1, 'Select at least one interest'),
  equipmentInterested: z.array(z.string()),
  equipmentUsedBefore: z.array(z.string()),

  hearAboutUs: z.enum([
    REFERRAL_SOURCES.FRIEND,
    REFERRAL_SOURCES.PROFESSOR,
    REFERRAL_SOURCES.ORIENTATION,
    REFERRAL_SOURCES.CLUB_FAIR,
    REFERRAL_SOURCES.SOCIAL_MEDIA,
    REFERRAL_SOURCES.WEBSITE,
    REFERRAL_SOURCES.POSTER,
    REFERRAL_SOURCES.EVENT,
    REFERRAL_SOURCES.OTHER,
  ]),
  signupMotivation: z.enum([
    SIGNUP_MOTIVATIONS.COURSE_REQUIREMENT,
    SIGNUP_MOTIVATIONS.PERSONAL_PROJECT,
    SIGNUP_MOTIVATIONS.RESEARCH,
    SIGNUP_MOTIVATIONS.STARTUP,
    SIGNUP_MOTIVATIONS.WORKSHOP,
    SIGNUP_MOTIVATIONS.LEARN_NEW_SKILL,
    SIGNUP_MOTIVATIONS.FRIEND_RECOMMENDED,
    SIGNUP_MOTIVATIONS.JUST_EXPLORING,
    SIGNUP_MOTIVATIONS.OTHER,
  ]),

  communicationPreferences: z.array(z.string()),

  agreedToTerms: z.boolean().refine((v) => v === true, 'You must agree to the Terms of Service'),
  agreedToPrivacyPolicy: z
    .boolean()
    .refine((v) => v === true, 'You must agree to the Privacy Policy'),
  agreedToSafetyTraining: z
    .boolean()
    .refine((v) => v === true, 'You must acknowledge Safety Training'),
});

const onboardingSchema = onboardingBaseSchema.superRefine((data, ctx) => {
  if (data.affiliation === AFFILIATIONS.UNDERGRADUATE) {
    if (!data.faculty) {
      ctx.addIssue({ code: 'custom', path: ['faculty'], message: 'Faculty is required' });
    }
    if (!data.program) {
      ctx.addIssue({ code: 'custom', path: ['program'], message: 'Program is required' });
    }
    if (!data.year) {
      ctx.addIssue({ code: 'custom', path: ['year'], message: 'Year is required' });
    }
  }

  if (data.affiliation === AFFILIATIONS.GRADUATE) {
    if (!data.faculty) {
      ctx.addIssue({ code: 'custom', path: ['faculty'], message: 'Faculty is required' });
    }
    if (!data.program) {
      ctx.addIssue({ code: 'custom', path: ['program'], message: 'Program is required' });
    }
    if (!data.degreeLevel) {
      ctx.addIssue({
        code: 'custom',
        path: ['degreeLevel'],
        message: "Master's/PhD is required",
      });
    }
  }

  if (data.affiliation === AFFILIATIONS.STAFF && !data.department) {
    ctx.addIssue({ code: 'custom', path: ['department'], message: 'Department is required' });
  }
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const { submitOnboarding } = useOnboardingStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      affiliation: AFFILIATIONS.UNDERGRADUATE,
      faculty: '',
      program: '',
      year: '',
      degreeLevel: '',
      department: '',
      interests: [],
      equipmentInterested: [],
      equipmentUsedBefore: [],
      hearAboutUs: undefined,
      signupMotivation: undefined,
      communicationPreferences: [],
      agreedToTerms: false,
      agreedToPrivacyPolicy: false,
      agreedToSafetyTraining: false,
    },
  });

  const affiliation = useWatch({ control: form.control, name: 'affiliation' });

  // Clear now-hidden conditional fields when the branch changes, so stale values can't
  // leak into submission.
  useEffect(() => {
    if (affiliation !== AFFILIATIONS.UNDERGRADUATE && affiliation !== AFFILIATIONS.GRADUATE) {
      form.setValue('faculty', '');
      form.setValue('program', '');
    }
    if (affiliation !== AFFILIATIONS.UNDERGRADUATE) {
      form.setValue('year', '');
    }
    if (affiliation !== AFFILIATIONS.GRADUATE) {
      form.setValue('degreeLevel', '');
    }
    if (affiliation !== AFFILIATIONS.STAFF) {
      form.setValue('department', '');
    }
  }, [affiliation, form]);

  async function onSubmit(values: OnboardingFormData) {
    try {
      setIsSubmitting(true);
      await submitOnboarding(values);
      router.push(Routes.dashboard);
    } catch {
      toast.error('Failed to submit onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Complete your profile</h1>
          <p className="text-balance text-muted-foreground">
            Just a few more details before you get access to the dashboard.
          </p>
        </div>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="affiliation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Affiliation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your affiliation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AFFILIATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(affiliation === AFFILIATIONS.UNDERGRADUATE ||
              affiliation === AFFILIATIONS.GRADUATE) && (
              <>
                <FormField
                  control={form.control}
                  name="faculty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faculty</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your faculty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FACULTY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="program"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Software Engineering" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {affiliation === AFFILIATIONS.UNDERGRADUATE && (
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROGRAM_YEAR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {affiliation === AFFILIATIONS.GRADUATE && (
              <FormField
                control={form.control}
                name="degreeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Master&apos;s/PhD</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select degree level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEGREE_LEVEL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {affiliation === AFFILIATIONS.STAFF && (
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
            <CardDescription>Tell us about your interests</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CheckboxGroupField
                      options={INTEREST_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      columns={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Equipment Interests */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="equipmentInterested"
              render={({ field: interestedField }) => (
                <FormField
                  control={form.control}
                  name="equipmentUsedBefore"
                  render={({ field: usedBeforeField }) => (
                    <EquipmentInterestGrid
                      equipment={EQUIPMENT_INTEREST_OPTIONS}
                      interested={interestedField.value}
                      usedBefore={usedBeforeField.value}
                      onInterestedChange={interestedField.onChange}
                      onUsedBeforeChange={usedBeforeField.onChange}
                    />
                  )}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>A Bit More About You</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="hearAboutUs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How did you first hear about us?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REFERRAL_SOURCE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="signupMotivation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What made you sign up today?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SIGNUP_MOTIVATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Communication Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Communication Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="communicationPreferences"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CheckboxGroupField
                      options={COMMUNICATION_PREFERENCE_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Agreements */}
        <Card>
          <CardHeader>
            <CardTitle>Agreements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormField
              control={form.control}
              name="agreedToTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">Terms of Service</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreedToPrivacyPolicy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">Privacy Policy</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreedToSafetyTraining"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    Safety Training Acknowledgement
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : 'Finish & Go to Dashboard'}
        </Button>
      </form>
    </Form>
  );
}
