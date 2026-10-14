import { cn } from '../../lib/cn';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

const textVariants = cva(
  cn(
    'text-foreground font-sans text-base',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        display: 'text-[44px] font-semibold leading-[48px] tracking-[-0.88px]',
        h1: cn('text-[32px] font-semibold leading-10 tracking-[-0.32px]', Platform.select({ web: 'scroll-m-20 text-balance' })),
        h2: cn('text-2xl font-semibold leading-8 tracking-[-0.24px]', Platform.select({ web: 'scroll-m-20' })),
        h3: cn('text-xl font-semibold leading-7 tracking-[-0.2px]', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('text-base font-semibold leading-6', Platform.select({ web: 'scroll-m-20' })),
        p: 'leading-6',
        blockquote: 'border-border border-l-2 pl-3',
        code: 'bg-e2 rounded-chip px-1.5 py-0.5 font-mono text-sm',
        lead: 'text-t2 text-base leading-6',
        large: 'text-base font-semibold',
        small: 'text-sm font-medium leading-5',
        muted: 'text-t3 text-sm leading-5',
        meta: 'text-t3 text-xs font-medium leading-4',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
