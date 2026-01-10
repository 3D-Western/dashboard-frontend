import { describe, it, expect } from 'vitest';
import { EXPERIENCE_LEVELS, EXPERIENCE_LEVEL_OPTIONS } from './experience-levels';

describe('experience-levels constants', () => {
  describe('EXPERIENCE_LEVELS', () => {
    it('defines NO_EXPERIENCE level', () => {
      expect(EXPERIENCE_LEVELS.NO_EXPERIENCE).toBe('no_experience');
    });

    it('defines BEGINNER level', () => {
      expect(EXPERIENCE_LEVELS.BEGINNER).toBe('beginner');
    });

    it('defines ADVANCED level', () => {
      expect(EXPERIENCE_LEVELS.ADVANCED).toBe('advanced');
    });

    it('has all required experience levels', () => {
      expect(EXPERIENCE_LEVELS).toHaveProperty('NO_EXPERIENCE');
      expect(EXPERIENCE_LEVELS).toHaveProperty('BEGINNER');
      expect(EXPERIENCE_LEVELS).toHaveProperty('ADVANCED');
    });

    it('all values are strings', () => {
      Object.values(EXPERIENCE_LEVELS).forEach((level) => {
        expect(typeof level).toBe('string');
      });
    });
  });

  describe('EXPERIENCE_LEVEL_OPTIONS', () => {
    it('has 3 options', () => {
      expect(EXPERIENCE_LEVEL_OPTIONS).toHaveLength(3);
    });

    it('includes NO_EXPERIENCE option', () => {
      const option = EXPERIENCE_LEVEL_OPTIONS.find(
        (opt) => opt.value === EXPERIENCE_LEVELS.NO_EXPERIENCE,
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe('No Experience');
    });

    it('includes BEGINNER option', () => {
      const option = EXPERIENCE_LEVEL_OPTIONS.find(
        (opt) => opt.value === EXPERIENCE_LEVELS.BEGINNER,
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe('Beginner');
    });

    it('includes ADVANCED option', () => {
      const option = EXPERIENCE_LEVEL_OPTIONS.find(
        (opt) => opt.value === EXPERIENCE_LEVELS.ADVANCED,
      );
      expect(option).toBeDefined();
      expect(option?.label).toBe('Advanced');
    });

    it('all options have value and label properties', () => {
      EXPERIENCE_LEVEL_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty('value');
        expect(option).toHaveProperty('label');
        expect(typeof option.value).toBe('string');
        expect(typeof option.label).toBe('string');
      });
    });

    it('options are in order: no_experience, beginner, advanced', () => {
      expect(EXPERIENCE_LEVEL_OPTIONS[0].value).toBe(EXPERIENCE_LEVELS.NO_EXPERIENCE);
      expect(EXPERIENCE_LEVEL_OPTIONS[1].value).toBe(EXPERIENCE_LEVELS.BEGINNER);
      expect(EXPERIENCE_LEVEL_OPTIONS[2].value).toBe(EXPERIENCE_LEVELS.ADVANCED);
    });

    it('all option values match EXPERIENCE_LEVELS values', () => {
      const optionValues = EXPERIENCE_LEVEL_OPTIONS.map((opt) => opt.value);
      const constantValues = Object.values(EXPERIENCE_LEVELS);
      expect(optionValues.sort()).toEqual(constantValues.sort());
    });
  });
});
