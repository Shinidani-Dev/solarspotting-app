"use client";

import { useState, useEffect } from 'react';
import { instrumentService } from '@/api/apiServices';
import { useParams } from 'next/navigation';
import { ArrowBigLeft } from 'lucide-react';
import Card from '@/components/ui/cards/Card';
import LinkButton from '@/components/ui/buttons/LinkButton';

export default function InstrumentDetailsPage() {
      const [instrument, setInstrument] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);

      const { id } = useParams();
    
      useEffect(() => {
        async function loadUserInstruments() {
          try {
            setLoading(true);
            const instrumentData = await instrumentService.getInstrument(id);
            setInstrument(instrumentData);
            setError(null);
          } catch (err) {
            console.error(`Error occured while loading instrument with ID ${id}:`, err);
            setError(`Error occured while loading instrument with ID ${id}`);
          } finally {
            setLoading(false);
          }
        }
    
        loadUserInstruments();
      }, [id]);
    
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
        <Card>
          <p className="text-amber-400">Instrument ID: {instrument.id}</p>
          <p className="text-amber-400">Instrument Type: {instrument.i_type}</p>
          <p className="text-amber-400">Instrument aperture: {instrument.i_aperture}</p>
          <LinkButton text="Back" Icon={ArrowBigLeft} variant="secondary" link="/instruments" />
          <LinkButton text="Edit" variant='outline' link={`/instruments/${instrument.id}/edit`} />
        </Card>
      );
}