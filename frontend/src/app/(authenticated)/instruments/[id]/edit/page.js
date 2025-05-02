"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { instrumentService } from "@/api/apiServices";
import InstrumentForm from "@/components/instruments/InstrumentForm";
import Heading from "@/components/ui/texts/Heading";
import LoadingIndicator from "@/components/ui/queryIndicators/LoadingIndicator";
import ErrorIndicator from "@/components/ui/queryIndicators/ErrorIndicator";

export default function EditInstrumentPage() {
  const params = useParams();
  const id = parseInt(params.id);
  
  const { data: instrument, isPending, isError, error } = useQuery({
    queryKey: ['instrument', id],
    queryFn: () => instrumentService.getInstrument(id),
    enabled: !!id,
  });
  
  if (isPending) {
    return <LoadingIndicator />;
  }
  
  if (isError) {
    return <ErrorIndicator error={error.info?.message || `Failed to load instrument with ID ${id}`} />;
  }
  
  return (
    <div>
      <Heading>Edit Instrument</Heading>
      <InstrumentForm instrument={instrument} isEdit={true} />
    </div>
  );
}