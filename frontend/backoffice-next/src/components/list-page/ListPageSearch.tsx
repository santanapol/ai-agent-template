import { Search } from "lucide-react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

interface ListPageSearchProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ListPageSearch({ id, value, onChange, placeholder = "Search…", className }: ListPageSearchProps) {
  return (
    <InputGroup className={cn("h-7 w-full max-w-xs bg-background sm:w-64", className)}>
      <InputGroupAddon align="inline-start">
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7"
      />
    </InputGroup>
  );
}
