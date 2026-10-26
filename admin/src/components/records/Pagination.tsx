type PaginationProps = {
  page: number;
  pages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

export function Pagination({ page, pages, loading, onPageChange }: PaginationProps) {
  return <div className="table-footer">
    <span>Page {page} of {pages}</span>
    <div className="pagination">
      <button className="button ghost" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>Previous</button>
      <button className="button ghost" disabled={page >= pages || loading} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  </div>;
}
