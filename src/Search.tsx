import { useId, useState } from "react";
import { search } from "./catalog";
export function Search<T extends { id: number; name: string }>({
  entries,
  label,
  onSelect,
}: {
  entries: T[];
  label: string;
  onSelect: (entry: T) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const id = useId();
  const results = search(entries, query);
  const shown = results.slice(0, 12);
  function pick(entry: T) {
    onSelect(entry);
    setQuery("");
    setOpen(false);
    setIndex(0);
  }
  return (
    <div className="catalog-search">
      <label>
        {label}
        <input
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && !!query.trim()}
          aria-controls={id}
          aria-activedescendant={
            open && shown[index] ? `${id}-${index}` : undefined
          }
          value={query}
          placeholder="Escribe para buscar…"
          onFocus={() => setOpen(true)}
          onBlur={(e) => {
            if (
              !e.currentTarget.parentElement?.parentElement?.contains(
                e.relatedTarget,
              )
            )
              setOpen(false);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setIndex(
                (i) =>
                  (i +
                    (e.key === "ArrowDown" ? 1 : -1) +
                    Math.max(shown.length, 1)) %
                  Math.max(shown.length, 1),
              );
            }
            if (e.key === "Enter" && open && shown[index]) {
              e.preventDefault();
              pick(shown[index]);
            }
          }}
        />
      </label>
      {open && query.trim() && (
        <div className="suggestions">
          <div id={id} role="listbox" aria-label={`Resultados: ${label}`}>
            {shown.map((e, i) => (
              <button
                type="button"
                role="option"
                aria-selected={index === i}
                id={`${id}-${i}`}
                key={e.id}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(e)}
              >
                {e.name}
                <small>#{e.id}</small>
              </button>
            ))}
          </div>
          <small role="status">
            {results.length === 0
              ? "Sin resultados. Usa la entrada manual."
              : `${results.length} resultados${results.length > 12 ? " · escribe más para filtrar" : ""}`}
          </small>
        </div>
      )}
    </div>
  );
}
