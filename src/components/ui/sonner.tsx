import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:max-w-[min(420px,calc(100vw-2rem))] group-[.toaster]:overflow-hidden",
          title: "group-[.toast]:break-words",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:break-words group-[.toast]:[overflow-wrap:anywhere] group-[.toast]:max-h-24 group-[.toast]:overflow-y-auto",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground shrink-0",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
