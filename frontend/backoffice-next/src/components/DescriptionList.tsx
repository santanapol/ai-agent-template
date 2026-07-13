import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DescriptionItem {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2;
}

interface DescriptionListProps {
  title?: string;
  description?: string;
  items: DescriptionItem[];
  className?: string;
  /** `tiles` = bordered admin grid (default). `plain` = document-style rows without nested cards. */
  variant?: "tiles" | "plain";
}

export function DescriptionList({ title, description, items, className, variant = "tiles" }: DescriptionListProps) {
  const plain = variant === "plain";
  const plainCols =
    items.length <= 3
      ? "sm:grid-cols-3"
      : items.length === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : items.length === 5
          ? "sm:grid-cols-2 lg:grid-cols-5"
          : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={className}>
      {title || description ? (
        <CardHeader className="px-0 pt-0">
          {title ? <CardTitle className="text-base">{title}</CardTitle> : null}
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      <dl
        className={cn(
          plain
            ? cn("grid w-full grid-cols-1 gap-x-8 gap-y-2", plainCols)
            : "grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2",
          // biome-ignore lint/nursery/useNullishCoalescing: treat empty-string title/description as absent
          (title || description) && "mt-4",
        )}
      >
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              plain ? "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5" : "bg-card p-4",
              item.span === 2 && "sm:col-span-2",
            )}
          >
            <dt className="shrink-0 text-muted-foreground text-xs">{item.label}</dt>
            <dd className={cn("min-w-0 font-medium text-sm", plain ? "text-pretty" : "mt-1")}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
