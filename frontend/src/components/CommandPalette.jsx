import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { CheckSquare, Lightbulb } from "lucide-react";
import { useDebouncedSearch } from "@/hooks/useDebouncedSearch";

export function CommandPalette({ open, setOpen }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedSearch(query, 250);

  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => (await API.get(`/search?q=${encodeURIComponent(debounced)}`)).data,
    enabled: debounced.length >= 1,
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Görev veya fikir ara..."
        value={query}
        onValueChange={setQuery}
        data-testid="command-search-input"
      />
      <CommandList>
        <CommandEmpty>{debounced ? "Sonuç bulunamadı." : "Aramaya başlayın..."}</CommandEmpty>
        {data?.tasks?.length > 0 && (
          <CommandGroup heading="Görevler">
            {data.tasks.map((t) => (
              <CommandItem key={t.id} value={`task-${t.id}-${t.title}`} onSelect={() => go(`/proje/${t.project_id}`)} data-testid={`search-task-${t.id}`}>
                <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                {t.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {data?.ideas?.length > 0 && (
          <CommandGroup heading="Fikirler">
            {data.ideas.map((i) => (
              <CommandItem key={i.id} value={`idea-${i.id}-${i.title}`} onSelect={() => go("/fikirler")} data-testid={`search-idea-${i.id}`}>
                <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />
                {i.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
