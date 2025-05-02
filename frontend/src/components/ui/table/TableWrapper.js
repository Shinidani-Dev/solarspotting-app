import React from 'react';

export default function TableWrapper({ columns, children }) {
  return (
    <div className="overflow-x-auto border rounded-lg bg-slate-800 border-slate-700">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            {columns.map((column, index) => (
              <th
                key={index}
                className="px-4 py-3 text-sm font-medium text-left text-amber-400"
              >
                {column}
              </th>
            ))}
            <th className="px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}