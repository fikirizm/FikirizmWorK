import { useRef, useEffect } from "react";
import { Bold, Italic, List, ListOrdered, Heading3 } from "lucide-react";

export function RichTextEditor({ value, onChange, placeholder = "Bir açıklama yazın...", minHeight = 120 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    onChange?.(ref.current.innerHTML);
  };

  const btn = "h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground";

  return (
    <div className="rounded-lg border border-input bg-background" data-testid="rich-text-editor">
      <div className="flex items-center gap-0.5 border-b border-border p-1">
        <button type="button" className={btn} onClick={() => exec("bold")} data-testid="rte-bold" title="Kalın">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => exec("italic")} data-testid="rte-italic" title="İtalik">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => exec("formatBlock", "H3")} data-testid="rte-heading" title="Başlık">
          <Heading3 className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => exec("insertUnorderedList")} data-testid="rte-ul" title="Madde listesi">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => exec("insertOrderedList")} data-testid="rte-ol" title="Numaralı liste">
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="rte-content px-3 py-2 text-sm leading-relaxed"
        onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
        data-testid="rte-input"
      />
    </div>
  );
}
