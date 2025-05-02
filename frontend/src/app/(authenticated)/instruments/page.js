"use client";

import { useQuery } from "@tanstack/react-query";
import { instrumentService } from "@/api/apiServices";
import Heading from "@/components/ui/texts/Heading";
import Card from "@/components/ui/cards/Card";
import LinkButton from "@/components/ui/buttons/LinkButton";
import LoadingIndicator from "@/components/ui/queryIndicators/LoadingIndicator";
import ErrorIndicator from "@/components/ui/queryIndicators/ErrorIndicator";
import TableWrapper from "@/components/ui/table/TableWrapper";
import InstrumentTableRow from "@/components/instruments/InstrumentTableRow";
import { Plus } from "lucide-react";

export default function InstrumentsPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => instrumentService.getMyInstruments(),
  });

  if (isPending) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return <ErrorIndicator error={error.info?.message || "Failed to load instruments"} />;
  }

  const instruments = data;
  
  // Table columns
  const columns = [
    "Serial Number",
    "Type",
    "Aperture",
    "Focal Length",
    "Projection",
    "Status"
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Heading>My Instruments</Heading>
        <LinkButton 
          text="Add Instrument" 
          Icon={Plus} 
          variant="primary" 
          link="/instruments/create" 
        />
      </div>
      
      {instruments.length > 0 ? (
        <Card>
          <TableWrapper columns={columns}>
            {instruments.map(instrument => (
              <InstrumentTableRow 
                key={instrument.id} 
                instrument={instrument} 
              />
            ))}
          </TableWrapper>
        </Card>
      ) : (
        <Card>
          <div className="py-8 text-center text-slate-400">
            <p className="mb-4">You haven no added instruments yet.</p>
            <LinkButton 
              text="Create Your First Instrument" 
              Icon={Plus} 
              variant="primary" 
              link="/instruments/create"
            />
          </div>
        </Card>
      )}
    </div>
  );
}