// From React Native Reusables (MIT): jade when on, e3 track when off.
import { cn } from '../../lib/cn';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { Platform } from 'react-native';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex h-7 w-12 shrink-0 flex-row items-center rounded-full border border-transparent',
        Platform.select({ web: 'focus-visible:ring-ring peer inline-flex outline-none transition-all focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed' }),
        props.checked ? 'bg-primary' : 'bg-e3 border-hair2',
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <SwitchPrimitives.Thumb
        className={cn(
          'size-5 rounded-full bg-white',
          Platform.select({ web: 'pointer-events-none block ring-0 transition-transform' }),
          props.checked ? 'translate-x-[24px]' : 'translate-x-[3px]'
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
