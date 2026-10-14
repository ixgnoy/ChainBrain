// From React Native Reusables (MIT). Variants are the five ChainBrain verdicts: tint fill, 28 % alpha border, text colour per MASTER.md.
import { TextClassContext } from './text';
import { cn } from '../../lib/cn';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { View } from 'react-native';

const badgeVariants = cva('group shrink-0 flex-row items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5', {
  variants: {
    variant: {
      default: 'bg-primary border-transparent',
      secondary: 'bg-e2 border-hair',
      outline: 'border-hair2',
      ok: 'bg-ok-soft border-ok-line',
      refused: 'bg-refused-soft border-refused-line',
      stepup: 'bg-stepup-soft border-stepup-line',
      revoked: 'bg-revoked-soft border-revoked-line',
      info: 'bg-info-soft border-info-line',
    },
  },
  defaultVariants: { variant: 'default' },
});

const badgeTextVariants = cva('text-xs font-medium leading-4', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-t2',
      outline: 'text-foreground',
      ok: 'text-ok-fg',
      refused: 'text-refused-fg',
      stepup: 'text-stepup-fg',
      revoked: 'text-revoked-fg',
      info: 'text-info-fg',
    },
  },
  defaultVariants: { variant: 'default' },
});

type BadgeProps = React.ComponentProps<typeof View> & React.RefAttributes<View> & {
  asChild?: boolean;
} & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  return (
    <TextClassContext.Provider value={badgeTextVariants({ variant })}>
      <Component className={cn(badgeVariants({ variant }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

export { Badge, badgeTextVariants, badgeVariants };
export type { BadgeProps };
