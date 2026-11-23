import { Page } from "../lib/types";

export function Pager({ data, onPage }: { data: Page<unknown>; onPage: (p: number) => void }) {
  if (data.pages <= 1) return null;
  return (<nav className="mt-4 flex items-center justify-between" aria-label="Pagination"><button className="btn-ghost" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Previous</button>
    <span className="text-sm text-muted">Page {data.page} of {data.pages} · {data.total} total</span><button className="btn-ghost" disabled={data.page >= data.pages} onClick={() => onPage(data.page + 1)}>Next</button></nav>);
}
