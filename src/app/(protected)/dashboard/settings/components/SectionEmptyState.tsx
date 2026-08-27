interface SectionEmptyStateProps {
  title: string;
  description: string;
}

export function SectionEmptyState({ title, description }: SectionEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
