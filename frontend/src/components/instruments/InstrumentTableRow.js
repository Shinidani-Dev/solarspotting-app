import React from 'react';
import Link from 'next/link';
import { Eye, Edit } from 'lucide-react';

export default function InstrumentTableRow({ instrument }) {
  return (
    <tr className="transition-colors border-b border-slate-700 hover:bg-slate-700/50">
      <td className="px-4 py-3 text-sm">
        {instrument.i_id || '-'}
      </td>
      <td className="px-4 py-3 text-sm font-medium">
        {instrument.i_type || 'Unnamed Instrument'}
      </td>
      <td className="px-4 py-3 text-sm">
        {instrument.i_aperture ? `${instrument.i_aperture}mm` : '-'}
      </td>
      <td className="px-4 py-3 text-sm">
        {instrument.i_focal_length ? `${instrument.i_focal_length}mm` : '-'}
      </td>
      <td className="px-4 py-3 text-sm">
        {instrument.i_projection ? `${instrument.i_projection}mm` : '-'}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 text-xs rounded-full ${
          instrument.in_use 
            ? 'bg-emerald-900/30 text-emerald-400' 
            : 'bg-red-900/30 text-red-400'
        }`}>
          {instrument.in_use ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end space-x-2">
          <Link 
            href={`/instruments/${instrument.id}`}
            className="p-1 rounded-md hover:bg-slate-600 text-amber-400"
            title="View details"
          >
            <Eye size={18} />
          </Link>
          <Link 
            href={`/instruments/${instrument.id}/edit`}
            className="p-1 rounded-md hover:bg-slate-600 text-slate-300"
            title="Edit instrument"
          >
            <Edit size={18} />
          </Link>
        </div>
      </td>
    </tr>
  );
}