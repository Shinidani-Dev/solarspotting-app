// pages/observations/[id]/edit.js
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import Heading from '@/components/ui/texts/Heading';
import LoadingIndicator from '@/components/ui/queryIndicators/LoadingIndicator';
import ErrorIndicator from '@/components/ui/queryIndicators/ErrorIndicator';
import { observationService } from '@/api/apiServices';
import ObservationForm from '@/components/observations/ObservationForm';

export default function EditObservationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  // Fetch the detailed observation data
  const { 
    data: detailedObservation, 
    isLoading: isLoadingObservation, 
    error: observationError 
  } = useQuery({
    queryKey: ['detailedObservation', id],
    queryFn: () => observationService.getDetailedObservation(id),
    enabled: !!user && !!id,
    // Add this to log the response and see what data is being returned
    onSuccess: (data) => {
      console.log("Detailed observation data loaded:", data);
    }
  });

  // Loading state
  const isLoading = isLoadingObservation;

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (observationError) {
    return <ErrorIndicator error={observationError.message || "Failed to load observation"} />;
  }

  if (!user) {
    return (
      <div className="p-4 text-center rounded-lg bg-slate-800">
        <p>Please log in to edit observations</p>
      </div>
    );
  }

  if (!detailedObservation) {
    return <ErrorIndicator error="Observation not found" />;
  }

  // Check if we have the expected data
  console.log("Before rendering form:", {
    observation: detailedObservation.observation,
    dayData: detailedObservation.day_data,
    groupData: detailedObservation.group_data || []
  });

  // Check if user has permission to edit
  const canEdit = user.id === detailedObservation.observation.observer_id || user.is_labeler;
  
  if (!canEdit) {
    return (
      <ErrorIndicator error="You don't have permission to edit this observation" />
    );
  }

  return (
    <div>
      <Heading>
        Edit Observation
      </Heading>
      
      <ObservationForm 
        observation={detailedObservation.observation} 
        dayData={detailedObservation.day_data}
        groupData={detailedObservation.group_data || []}
        isEdit={true} 
      />
    </div>
  );
}