"use client";

import { useState, useEffect } from "react";
import { instrumentService } from "@/api/apiServices";
import { useParams } from "next/navigation";
import { ArrowBigLeft } from "lucide-react";
import Card from "@/components/ui/cards/Card";
import LinkButton from "@/components/ui/buttons/LinkButton";
import LoadingIndicator from "@/components/ui/queryIndicators/LoadingIndicator";
import ErrorIndicator from "@/components/ui/queryIndicators/ErrorIndicator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import InstrumentDetails from "@/components/instruments/InstrumentDetails";

export default function InstrumentDetailsPage() {
  const params = useParams();
  const id = parseInt(params.id);
  const queryClient = useQueryClient();

  const {
    data: instrument,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ["instrument", id],
    queryFn: () => instrumentService.getInstrument(id),
    placeholderData: () => {
      // Find the instrument in the existing cache
      const allInstruments = queryClient.getQueryData(["instruments"]);
      if (!allInstruments) return undefined;

      return allInstruments.find((instrument) => instrument.id === id);
    },
    enabled: !!id,
  });

  if (isPending) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return (
      <ErrorIndicator
        error={error.info?.message || `failed to load instrument ${id}`}
      />
    );
  }

  return <InstrumentDetails instrument={instrument} />;
}
