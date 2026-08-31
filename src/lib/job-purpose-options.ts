export interface PurposeOption {
  readonly value: string;
  readonly label: string;
}

export const PURPOSE_OPTIONS: readonly PurposeOption[] = [
  { value: 'casual', label: 'Casual / Recreation' },
  { value: 'personal', label: 'Personal Project' },
  { value: 'school', label: 'School Project' },
  { value: 'research', label: 'Academic Research' },
  { value: 'community', label: 'Charity / Community' },
  { value: 'product', label: 'Product Development' },
  { value: 'entrepreneurial', label: 'Entrepreneurial Project' },
] as const;
