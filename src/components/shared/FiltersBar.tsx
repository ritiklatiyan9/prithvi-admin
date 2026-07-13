import { useEffect, useState, type ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/utils/cn";

export interface FilterSelectOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  /** Stable identity for the select (React key). */
  key: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  className?: string;
}

export interface DateRangeValue {
  /** "yyyy-MM-dd" or "" for unset. */
  from: string;
  to: string;
}

export interface FiltersBarProps {
  /** Debounced search input; onChange fires ~400ms after the user stops typing. */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
  };
  selects?: FilterSelect[];
  dateRange?: {
    value: DateRangeValue;
    onChange: (value: DateRangeValue) => void;
  };
  /** Renders a "Clear" button when provided. */
  onClearAll?: () => void;
  className?: string;
  /** Extra controls rendered at the end of the row (e.g. <ExportButton />). */
  children?: ReactNode;
}

const DebouncedSearch = ({
  value,
  onChange,
  placeholder,
  className,
}: NonNullable<FiltersBarProps["search"]>): JSX.Element => {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Sync external resets (e.g. clear-all).
  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <SearchInput
      value={text}
      onChange={setText}
      placeholder={placeholder}
      className={cn("w-full sm:w-64", className)}
    />
  );
};

export const FiltersBar = ({
  search,
  selects,
  dateRange,
  onClearAll,
  className,
  children,
}: FiltersBarProps): JSX.Element => (
  <div className={cn("mb-4 flex flex-wrap items-center gap-3", className)}>
    {search && <DebouncedSearch {...search} />}
    {selects?.map(({ key, value, onChange, options, placeholder, className: selectClassName }) => (
      <Select key={key} value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("w-full sm:w-44", selectClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ))}
    {dateRange && (
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={dateRange.value.from}
          max={dateRange.value.to || undefined}
          onChange={(event) =>
            dateRange.onChange({ ...dateRange.value, from: event.target.value })
          }
          className="w-36"
          aria-label="From date"
        />
        <span className="text-sm text-muted-foreground">–</span>
        <Input
          type="date"
          value={dateRange.value.to}
          min={dateRange.value.from || undefined}
          onChange={(event) => dateRange.onChange({ ...dateRange.value, to: event.target.value })}
          className="w-36"
          aria-label="To date"
        />
      </div>
    )}
    {onClearAll && (
      <Button variant="ghost" onClick={onClearAll}>
        <XMarkIcon className="mr-1 h-4 w-4" /> Clear
      </Button>
    )}
    {children}
  </div>
);
