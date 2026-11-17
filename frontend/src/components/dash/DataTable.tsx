import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: ((row: T) => string | number) | undefined;
  align?: "left" | "right" | undefined;
  className?: string | undefined;
};

export type DataTableFilter<T> = {
  id: string;
  label: string;
  options: { label: string; value: string }[];
  match: (row: T, value: string) => boolean;
};

export type DataTableAction<T> = {
  label: string;
  icon?: LucideIcon | undefined;
  destructive?: boolean | undefined;
  onSelect: (row: T) => void;
};

/**
 * Glass-styled management table: search, per-column filters, sortable headers,
 * pagination and a per-row action menu.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchFields,
  searchPlaceholder = "Search…",
  filters,
  actions,
  initialSort,
  pageSize = 8,
  empty,
  toolbar,
  caption,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  searchFields?: ((row: T) => (string | number | null | undefined)[]) | undefined;
  searchPlaceholder?: string | undefined;
  filters?: DataTableFilter<T>[] | undefined;
  actions?: ((row: T) => DataTableAction<T>[]) | undefined;
  initialSort?: { columnId: string; direction: SortDirection } | undefined;
  pageSize?: number | undefined;
  empty?: ReactNode | undefined;
  toolbar?: ReactNode | undefined;
  caption?: string | undefined;
}) {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection }>(
    initialSort ?? { columnId: columns[0]?.id ?? "", direction: "desc" },
  );
  const [page, setPage] = useState(1);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (query && searchFields) {
          const fields = searchFields(row);
          if (!fields.some((field) => field != null && String(field).toLowerCase().includes(query)))
            return false;
        }
        for (const filter of filters ?? []) {
          const value = filterValues[filter.id];
          if (value && value !== "all" && !filter.match(row, value)) return false;
        }
        return true;
      }),
    [rows, query, searchFields, filters, filterValues],
  );

  const sorted = useMemo(() => {
    const column = columns.find((candidate) => candidate.id === sort.columnId);
    const getter = column?.sortValue;
    if (!getter) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getter(a);
      const bv = getter(b);
      const result =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.direction === "asc" ? result : -result;
    });
    return copy;
  }, [filtered, columns, sort]);

  useEffect(() => {
    setPage(1);
  }, [query, filterValues]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const pageNumbers = useMemo(() => {
    const span = 5;
    const first = Math.max(1, Math.min(current - 2, pageCount - span + 1));
    const last = Math.min(pageCount, first + span - 1);
    const numbers: number[] = [];
    for (let index = first; index <= last; index += 1) numbers.push(index);
    return numbers;
  }, [current, pageCount]);

  const toggleSort = (columnId: string) => {
    setSort((previous) =>
      previous.columnId === columnId
        ? { columnId, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: "asc" },
    );
  };

  const hasToolbar = Boolean(filters?.length || searchFields || toolbar);

  return (
    <div>
      {hasToolbar && (
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {filters?.map((filter) => (
              <Select
                key={filter.id}
                value={filterValues[filter.id] ?? "all"}
                onValueChange={(value) =>
                  setFilterValues((previous) => ({ ...previous, [filter.id]: value }))
                }
              >
                <SelectTrigger
                  aria-label={filter.label}
                  className="glass-tile h-9 w-auto gap-1.5 rounded-full border px-3 text-xs font-semibold text-foreground/80"
                >
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent className="glass-panel rounded-2xl">
                  <SelectItem value="all">All {filter.label.toLowerCase()}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {searchFields && (
              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="glass-tile h-9 w-full rounded-full border pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => {
                const isSorted = sort.columnId === column.id;
                const SortIcon = !isSorted
                  ? ArrowUpDown
                  : sort.direction === "asc"
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : "none"
                    }
                    className={cn(
                      "border-b border-border/60 px-3 pb-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
                      column.align === "right" && "text-right",
                      column.className,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded transition hover:text-foreground",
                          column.align === "right" && "flex-row-reverse",
                          isSorted && "text-foreground",
                        )}
                      >
                        {column.header}
                        <SortIcon className="size-3" aria-hidden />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {actions ? (
                <th scope="col" className="w-10 border-b border-border/60 pb-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {empty ?? "No results match your filters."}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={rowKey(row)} className="group transition-colors hover:bg-secondary/35">
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn(
                        "border-b border-border/40 px-3 py-3 align-middle",
                        column.align === "right" && "text-right",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                  {actions ? (
                    <td className="border-b border-border/40 px-1 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground opacity-70 transition hover:bg-secondary/70 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                            aria-label="Row actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-panel w-44 rounded-2xl">
                          {actions(row).map((action) => (
                            <DropdownMenuItem
                              key={action.label}
                              onSelect={() => action.onSelect(row)}
                              className={cn(
                                "cursor-pointer",
                                action.destructive && "text-destructive focus:text-destructive",
                              )}
                            >
                              {action.icon ? <action.icon className="size-4" aria-hidden /> : null}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {sorted.length === 0
            ? "0 results"
            : `Showing ${start + 1}–${Math.min(start + pageSize, sorted.length)} of ${sorted.length}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Previous page"
            disabled={current <= 1}
            onClick={() => setPage(Math.max(1, current - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              onClick={() => setPage(number)}
              aria-current={number === current ? "page" : undefined}
              className={cn(
                "size-8 rounded-full text-xs font-semibold transition",
                number === current
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "glass-tile border text-foreground/70 hover:border-primary/30 hover:text-foreground",
              )}
            >
              {number}
            </button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            aria-label="Next page"
            disabled={current >= pageCount}
            onClick={() => setPage(Math.min(pageCount, current + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
