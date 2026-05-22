import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function SearchableSelect({ 
  options = [], 
  value, 
  onValueChange, 
  placeholder = "Select option...", 
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className
}) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  // Options should be an array of { label: string, value: string }
  // If array of strings is passed, map it internally
  const formattedOptions = React.useMemo(() => {
    if (!options || !Array.isArray(options)) return [];
    if (options.length > 0 && typeof options[0] === 'string') {
      return options.map(opt => ({ label: opt, value: opt }));
    }
    return options;
  }, [options]);

  const selectedOption = formattedOptions.find((opt) => String(opt.value) === String(value));

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal text-slate-900 dark:text-slate-100", className)}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="p-0 max-h-[85vh] bg-card text-slate-900 dark:text-slate-100 border-border">
          <div className="p-4 text-center font-bold text-sm tracking-wide text-slate-500 dark:text-slate-400 border-b border-border/40 pb-3">
            {placeholder}
          </div>
          <Command className="pb-6">
            <CommandInput placeholder={searchPlaceholder} className="border-none focus:ring-0 text-slate-900 dark:text-slate-100" />
            <CommandList className="max-h-[50vh] overflow-y-auto mt-2">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {formattedOptions.map((opt) => (
                  <CommandItem
                    key={String(opt.value)}
                    value={opt.label}
                    onSelect={(currentValue) => {
                      const safeCurrentValue = String(currentValue || '').toLowerCase();
                      const selected = formattedOptions.find(o => String(o.label || '').toLowerCase() === safeCurrentValue);
                      if (selected) {
                        onValueChange(selected.value);
                      }
                      setOpen(false);
                    }}
                    className="py-3 px-4 text-sm flex items-center hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(value) === String(opt.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal text-slate-900 dark:text-slate-100", className)}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        side="bottom"
        avoidCollisions={true}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {formattedOptions.map((opt) => (
                <CommandItem
                  key={String(opt.value)}
                  value={opt.label}
                  onSelect={(currentValue) => {
                    const safeCurrentValue = String(currentValue || '').toLowerCase();
                    const selected = formattedOptions.find(o => String(o.label || '').toLowerCase() === safeCurrentValue);
                    if (selected) {
                      onValueChange(selected.value);
                    }
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(value) === String(opt.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
