"use client";

import InstrumentForm from "@/components/instruments/InstrumentForm";
import Heading from "@/components/ui/texts/Heading";

export default function CreateInstrumentPage() {
  return (
    <div>
      <Heading>Create New Instrument</Heading>
      <InstrumentForm />
    </div>
  );
}