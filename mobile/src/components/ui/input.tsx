// From React Native Reusables (MIT): e2 fill, hairline border, 10 px radius, 48 px high.
import { cn } from '../../lib/cn';
import { Platform, TextInput } from 'react-native';

function Input({ className, ...props }: React.ComponentProps<typeof TextInput> & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        'border-input bg-e2 text-foreground font-sans flex h-12 w-full min-w-0 flex-row items-center rounded-md border px-3.5 text-base leading-5',
        props.editable === false && cn('opacity-50', Platform.select({ web: 'disabled:pointer-events-none disabled:cursor-not-allowed' })),
        Platform.select({
          web: 'placeholder:text-t3 selection:bg-primary selection:text-primary-foreground focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          native: 'placeholder:text-t3',
        }),
        className
      )}
      {...props}
    />
  );
}

export { Input };
