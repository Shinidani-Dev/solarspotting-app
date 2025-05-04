'use client';

import { useAuth } from '@/hooks/useAuth';
import Heading from '@/components/ui/texts/Heading';
import LoadingIndicator from '@/components/ui/queryIndicators/LoadingIndicator';
import ObservationForm from '@/components/observations/ObservationForm';

export default function NewObservationPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <LoadingIndicator />;
  }

  if (!user) {
    return (
      <div className="p-4 text-center rounded-lg bg-slate-800">
        <p>Please log in to create observations</p>
      </div>
    );
  }

  return (
    <div>
      <Heading>
        Create New Observation
      </Heading>
      
      <ObservationForm isEdit={false} />
    </div>
  );
}