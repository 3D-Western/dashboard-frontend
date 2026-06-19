import React from 'react';

interface PrintSpecsProps {
  specsJson?: string | Record<string, any>;
}

export function PrintSpecifications({ specsJson }: PrintSpecsProps) {
  if (!specsJson) {
    return <p className="text-sm text-muted-foreground">No specifications provided.</p>;
  }

  let specs: Record<string, any> = {};

  try {
    specs = typeof specsJson === 'string' ? JSON.parse(specsJson) : specsJson;
  } catch (error) {
    return (
      <div className="overflow-auto rounded-xl border bg-muted/10 p-4">
        <pre className="text-sm text-muted-foreground">{String(specsJson)}</pre>
      </div>
    );
  }

  const specKeys = Object.keys(specs);

  if (specKeys.length === 0) {
    return <p className="text-sm text-muted-foreground">No specifications provided.</p>;
  }

  return (
    <div className="rounded-xl border bg-muted/10 p-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specKeys.map((key) => (
          <div key={key}>
            {/* Capitalize the key for better readability (e.g., "material" -> "Material") */}
            <dt className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {key}
            </dt>
            <dd className="text-sm font-medium text-foreground">{String(specs[key])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
