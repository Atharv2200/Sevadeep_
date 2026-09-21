import Button from './Button'

// Range summary and previous/next controls for a { page, limit, total } collection.
export default function Pagination({ page, pageSize, count, total, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between gap-4 p-4 text-sm text-gray-600">
      <p>
        Showing {(page - 1) * pageSize + 1}–{(page - 1) * pageSize + count} of {total}
      </p>
      <div className="flex items-center gap-2">
        <span>Page {page} of {totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </div>
  )
}
