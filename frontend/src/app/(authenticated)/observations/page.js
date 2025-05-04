'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';
import Heading from '@/components/ui/texts/Heading';
import TableWrapper from '@/components/ui/table/TableWrapper';
import ObservationTableRow from '@/components/observations/ObservationTableRow';
import LoadingIndicator from '@/components/ui/queryIndicators/LoadingIndicator';
import ErrorIndicator from '@/components/ui/queryIndicators/ErrorIndicator';
import LinkButton from '@/components/ui/buttons/LinkButton';
import { observationService } from '@/api/apiServices';

export default function ObservationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // Setup columns for the table
  const [columns, setColumns] = useState([
    'Date',
    'Observer',
    'Instrument',
    'Status',
    'Notes',
    'Public'
  ]);

  // Add "Verified" column for labelers
  useEffect(() => {
    if (user?.is_labeler) {
      setColumns([
        'Date',
        'Observer',
        'Instrument',
        'Status',
        'Notes',
        'Public',
        'Verified'
      ]);
    }
  }, [user]);

  // Fetch observations using the service
  const { data: observations, isLoading, error } = useQuery({
    queryKey: ['observations'],
    queryFn: observationService.getObservations,
    enabled: !!user,
  });

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (authLoading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return (
      <div className="p-4 text-center rounded-lg bg-slate-800">
        <p>Please log in to view observations</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col mb-6 md:flex-row md:items-center md:justify-between">
        <Heading>
          Solar Observations
        </Heading>
        
        <LinkButton 
          text="Create New Observation" 
          link="/observations/create"
          Icon={Plus}
          variant="primary"
        />
      </div>

      {error && <ErrorIndicator error={error.message || "Failed to load observations"} />}

      {isLoading ? (
        <LoadingIndicator />
      ) : observations && observations.length > 0 ? (
        <TableWrapper columns={columns}>
          {observations.map((observation) => (
            <ObservationTableRow 
              key={observation.id} 
              observation={observation} 
              currentUser={user}
            />
          ))}
        </TableWrapper>
      ) : (
        <div className="p-6 text-center border rounded-lg bg-slate-800 border-slate-700">
          <p className="text-slate-400">No observations found.</p>
          <p className="mt-2 text-sm text-slate-500">
            Create your first observation to get started.
          </p>
        </div>
      )}
    </div>
  );
}