"use client";

import Heading from "@/components/ui/texts/Heading";
import { useState, useEffect } from "react";
import { instrumentService } from "@/api/apiServices";
import CardWrapper from "@/components/ui/cards/CardWrapper";
import Card from "@/components/ui/cards/Card";
import LinkButton from "@/components/ui/buttons/LinkButton";

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUserInstruments() {
      try {
        setLoading(true);
        const instrumentData = await instrumentService.getMyInstruments();
        setInstruments(instrumentData);
        setError(null);
      } catch (err) {
        console.error("Error occured while loading instruments:", err);
        setError("Error occured while loading instruments.");
      } finally {
        setLoading(false);
      }
    }

    loadUserInstruments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="w-12 h-12 border-t-2 border-b-2 rounded-full animate-spin border-amber-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-l-4 border-red-500 rounded-md bg-red-500/10">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <Heading>Instruments</Heading>
      <div className="space-y-5">
        <CardWrapper>
          {instruments.map((instrument) => (
            <Card key={instrument.id}>
              <div>{instrument.i_type}</div>
              <LinkButton
                text="Details"
                variant="primary"
                link={`/instruments/${instrument.id}`}
              />
              <LinkButton
                text="Edit"
                variant="outline"
                link={`/instruments/${instrument.id}/edit`}
              />
            </Card>
          ))}
        </CardWrapper>
        <CardWrapper>
          <Card>
            <h2>Create new Instrumnet</h2>
            <LinkButton text="Create" variant="success" link="/instruments/create" />
          </Card>
        </CardWrapper>
      </div>
    </div>
  );
}
