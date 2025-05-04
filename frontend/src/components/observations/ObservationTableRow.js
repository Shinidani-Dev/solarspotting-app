import React from 'react';
import Link from 'next/link';
import { Eye, Edit } from 'lucide-react';
import { formatDate } from '@/lib/helperFunctions';

export default function ObservationTableRow({ observation, currentUser }) {
  // Determine if the current user can edit this observation
  const canEdit = currentUser && 
    (observation.observer_id === currentUser.id || currentUser.is_labeler);

  return (
    <tr className="transition-colors border-b border-slate-700 hover:bg-slate-700/50">
      <td className="px-4 py-3 text-sm">
        {formatDate(observation.created)}
      </td>
      <td className="px-4 py-3 text-sm">
        {observation.observer_id}
      </td>
      <td className="px-4 py-3 text-sm">
        {observation.instrument_id}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 text-xs rounded-full ${
          observation.status === 'draft' 
            ? 'bg-yellow-900/30 text-yellow-400' 
            : 'bg-emerald-900/30 text-emerald-400'
        }`}>
          {observation.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        {observation.notes ? 
          (observation.notes.length > 20 ? 
            `${observation.notes.substring(0, 20)}...` : 
            observation.notes) : 
          '-'}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`px-2 py-1 text-xs rounded-full ${
          observation.is_public 
            ? 'bg-emerald-900/30 text-emerald-400' 
            : 'bg-slate-700/50 text-slate-400'
        }`}>
          {observation.is_public ? 'Public' : 'Private'}
        </span>
      </td>
      {currentUser && currentUser.is_labeler && (
        <td className="px-4 py-3 text-sm">
          <span className={`px-2 py-1 text-xs rounded-full ${
            observation.verified 
              ? 'bg-emerald-900/30 text-emerald-400' 
              : 'bg-slate-700/50 text-slate-400'
          }`}>
            {observation.verified ? 'Verified' : 'Unverified'}
          </span>
        </td>
      )}
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end space-x-2">
          <Link 
            href={`/observations/${observation.id}`}
            className="p-1 rounded-md hover:bg-slate-600 text-amber-400"
            title="View details"
          >
            <Eye size={18} />
          </Link>
          {canEdit && (
            <Link 
              href={`/observations/${observation.id}/edit`}
              className="p-1 rounded-md hover:bg-slate-600 text-slate-300"
              title="Edit observation"
            >
              <Edit size={18} />
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}