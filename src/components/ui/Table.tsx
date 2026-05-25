interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T | string;
  'aria-label'?: string;
}

export function Table<T>({
  columns,
  data,
  keyField,
  'aria-label': ariaLabel,
}: TableProps<T>) {
  const getValue = (row: T, key: keyof T | string): unknown => {
    const r = row as Record<string, unknown>;
    const k = typeof key === 'string' ? key : String(key);
    return r[k];
  };

  return (
    <div className="overflow-x-auto">
      <table
        className="min-w-full divide-y divide-slate-700"
        aria-label={ariaLabel}
      >
        <thead className="bg-slate-800">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-[#0f172a] divide-y divide-slate-700">
          {data.map((row) => (
            <tr key={String(getValue(row, keyField))} className="hover:bg-slate-800/70">
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap"
                >
                  {col.render
                    ? col.render(row)
                    : String(getValue(row, col.key) ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
