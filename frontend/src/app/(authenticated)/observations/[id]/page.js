'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import Heading from '@/components/ui/texts/Heading';
import LoadingIndicator from '@/components/ui/queryIndicators/LoadingIndicator';
import ErrorIndicator from '@/components/ui/queryIndicators/ErrorIndicator';
import { observationService, dayDataService, groupDataService, instrumentService } from '@/api/apiServices';
import ObservationDetails from '@/components/observations/ObservationDetails';

export default function ObservationDetailPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  // Fetch the observation data
  const { 
    data: observation, 
    isLoading: isLoadingObservation, 
    error: observationError 
  } = useQuery({
    queryKey: ['observation', id],
    queryFn: () => observationService.getObservation(id),
    enabled: !!user && !!id,
  });

  // Fetch the instrument data if observation is loaded
  const {
    data: instrument,
    isLoading: isLoadingInstrument,
  } = useQuery({
    queryKey: ['instrument', observation?.instrument_id],
    queryFn: () => instrumentService.getInstrument(observation.instrument_id),
    enabled: !!observation?.instrument_id,
    // If the request fails, we don't want to block the UI
    retry: false,
    onError: (error) => {
      console.log('Error fetching instrument:', error);
    }
  });

  // Fetch the day data
  const {
    data: dayData,
    isLoading: isLoadingDayData,
  } = useQuery({
    queryKey: ['dayData', id],
    queryFn: () => dayDataService.getDayDataByObservation(id),
    enabled: !!observation,
    // If the request fails, we don't want to block the UI
    retry: false,
    onError: (error) => {
      console.log('Error fetching day data:', error);
    }
  });

  // Fetch the group data
  const {
    data: groupData,
    isLoading: isLoadingGroupData,
  } = useQuery({
    queryKey: ['groupData', id],
    queryFn: () => groupDataService.getGroupDataByObservation(id),
    enabled: !!observation,
    // If the request fails, we don't want to block the UI
    retry: false,
    onError: (error) => {
      console.log('Error fetching group data:', error);
    }
  });

  // Primary loading state - only block for essential data
  const isLoading = authLoading || isLoadingObservation;

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (observationError) {
    return <ErrorIndicator error={observationError.message || "Failed to load observation"} />;
  }

  if (!user) {
    return (
      <div className="p-4 text-center rounded-lg bg-slate-800">
        <p>Please log in to view observations</p>
      </div>
    );
  }

  if (!observation) {
    return <ErrorIndicator error="Observation not found" />;
  }

  // Show UI even if secondary data is still loading
  const isLoadingSecondaryData = isLoadingInstrument || isLoadingDayData || isLoadingGroupData;

  return (
    <div>
      <Heading>
        Observation Details
      </Heading>
      
      <ObservationDetails 
        observation={observation}
        instrument={instrument}
        dayData={dayData}
        groupData={groupData}
        isLoadingSecondaryData={isLoadingSecondaryData}
        currentUser={user} 
      />
    </div>
  );
}