import Image from 'next/image';
import { cn } from '@/lib/utils';

// Official 3D Western logo files (public/brand). Each renders the light-theme and dark-theme
// artwork and lets CSS show the one that matches the active theme. Both fill their parent,
// so the parent needs `relative` and a size.

interface BrandLogoProps {
  className?: string;
  priority?: boolean;
}

/** The badge on its own (01-default-mark). */
export function BrandMark({ className, priority }: BrandLogoProps) {
  return (
    <>
      <Image
        src="/brand/mark-for-light.svg"
        alt="3D Western"
        fill
        priority={priority}
        className={cn('object-contain dark:hidden', className)}
      />
      <Image
        src="/brand/mark-for-dark.svg"
        alt="3D Western"
        fill
        priority={priority}
        className={cn('hidden object-contain dark:block', className)}
      />
    </>
  );
}

/** The badge with the "3D Western Makerspaces" wordmark (02-primary-lockup). */
export function BrandLockup({ className, priority }: BrandLogoProps) {
  return (
    <>
      <Image
        src="/brand/lockup-for-light.svg"
        alt="3D Western Makerspaces"
        fill
        priority={priority}
        className={cn('object-contain dark:hidden', className)}
      />
      <Image
        src="/brand/lockup-for-dark.svg"
        alt="3D Western Makerspaces"
        fill
        priority={priority}
        className={cn('hidden object-contain dark:block', className)}
      />
    </>
  );
}
