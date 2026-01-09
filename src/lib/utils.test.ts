import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('merges Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
  });

  it('handles falsy conditional classes', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class');
    expect(result).not.toContain('active-class');
  });

  it('handles arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });

  it('handles objects with boolean values', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true,
    });
    expect(result).toContain('class1');
    expect(result).not.toContain('class2');
    expect(result).toContain('class3');
  });

  it('removes duplicate classes', () => {
    const result = cn('px-2', 'px-2');
    expect(result).toBe('px-2');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles undefined and null values', () => {
    const result = cn('class1', undefined, null, 'class2');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
  });

  it('resolves Tailwind class conflicts', () => {
    const result = cn('text-sm', 'text-lg');
    expect(result).toBe('text-lg');
    expect(result).not.toContain('text-sm');
  });

  it('handles complex class combinations', () => {
    const result = cn(
      'flex items-center',
      { 'bg-blue-500': true, 'bg-red-500': false },
      ['hover:bg-blue-600', 'cursor-pointer'],
    );
    expect(result).toContain('flex');
    expect(result).toContain('items-center');
    expect(result).toContain('bg-blue-500');
    expect(result).not.toContain('bg-red-500');
    expect(result).toContain('hover:bg-blue-600');
    expect(result).toContain('cursor-pointer');
  });

  it('merges responsive classes correctly', () => {
    const result = cn('w-full', 'md:w-1/2', 'lg:w-1/3');
    expect(result).toContain('w-full');
    expect(result).toContain('md:w-1/2');
    expect(result).toContain('lg:w-1/3');
  });

  it('handles state variants', () => {
    const result = cn('bg-blue-500', 'hover:bg-blue-600', 'active:bg-blue-700');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('hover:bg-blue-600');
    expect(result).toContain('active:bg-blue-700');
  });
});
