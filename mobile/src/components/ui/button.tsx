// From React Native Reusables (MIT), restyled to Ink & jade: 10 px radius, hairlines, no shadows, 44 px minimum height.
import { TextClassContext } from './text';
import { cn } from '../../lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group shrink-0 flex-row items-center justify-center gap-2 rounded-md',
    Platform.select({
      web: 'focus-visible:ring-ring whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    })
  ),
  {
    variants: {
      variant: {
        default: cn('bg-primary active:bg-jade-press', Platform.select({ web: 'hover:bg-jade-hi' })),
        destructive: cn('bg-refused-soft border-refused-line border active:opacity-80'),
        outline: cn('border-input border bg-transparent active:bg-e3', Platform.select({ web: 'hover:bg-e2' })),
        secondary: cn('bg-e2 border-hair border active:bg-e3', Platform.select({ web: 'hover:bg-e3' })),
        ghost: cn('active:bg-e3', Platform.select({ web: 'hover:bg-e2' })),
        link: '',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-11 gap-1.5 px-4',
        lg: 'h-14 px-6',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn('text-foreground font-semibold text-base', Platform.select({ web: 'pointer-events-none' })),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-refused-fg',
        outline: '',
        secondary: '',
        ghost: '',
        link: cn('text-jade-ink group-active:underline', Platform.select({ web: 'underline-offset-4 hover:underline group-hover:underline' })),
      },
      size: {
        default: '',
        sm: 'text-sm',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> & React.RefAttributes<typeof Pressable> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-45', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
