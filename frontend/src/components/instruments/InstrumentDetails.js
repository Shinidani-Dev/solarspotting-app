import React from "react";
import LinkButton from "../ui/buttons/LinkButton";
import Card from "../ui/cards/Card";
import { ArrowBigLeft, Edit } from "lucide-react";
import { formatDate } from "../../lib/helperFunctions";

export default function InstrumentDetails({ instrument }) {
    return (
      <Card>
        <div className="space-y-6">
          {/* Header section */}
          <div className="pb-4 border-b border-slate-700">
            <h2 className="mb-1 text-xl font-bold text-amber-400">
              {instrument.i_type || "Unnamed Instrument"}
            </h2>
            <p className="text-sm text-slate-400">
              ID: {instrument.id} • Added on {formatDate(instrument.tstamp)}
            </p>
          </div>
  
          {/* Main specifications grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="mb-1 text-sm text-slate-400">Aperture</p>
              <p>{instrument.i_aperture ? `${instrument.i_aperture}mm` : "Not specified"}</p>
            </div>
            
            <div>
              <p className="mb-1 text-sm text-slate-400">Focal Length</p>
              <p>{instrument.i_focal_length ? `${instrument.i_focal_length}mm` : "Not specified"}</p>
            </div>
            
            <div>
              <p className="mb-1 text-sm text-slate-400">Filter</p>
              <p>{instrument.i_filter || "None"}</p>
            </div>
            
            <div>
              <p className="mb-1 text-sm text-slate-400">Method</p>
              <p>{instrument.i_method || "Not specified"}</p>
            </div>
            
            <div>
              <p className="mb-1 text-sm text-slate-400">Magnification</p>
              <p>{instrument.i_magnification ? `${instrument.i_magnification}x` : "Not specified"}</p>
            </div>
            
            <div>
              <p className="mb-1 text-sm text-slate-400">Projection</p>
              <p>{instrument.i_projection ? `${instrument.i_projection}mm` : "Not specified"}</p>
            </div>
          </div>
  
          {/* Additional details */}
          <div className="p-4 space-y-2 rounded-md bg-slate-700/30">
            <p className="text-sm font-medium text-amber-400">Additional Information</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <span className="text-sm text-slate-400">Serial Number/ID: </span>
                <span>{instrument.i_id || "Not available"}</span>
              </div>
              
              <div>
                <span className="text-sm text-slate-400">Input Preference: </span>
                <span>{instrument.i_inputpref !== null ? instrument.i_inputpref : "Not specified"}</span>
              </div>
              
              <div>
                <span className="text-sm text-slate-400">Observer ID: </span>
                <span>{instrument.observer_id}</span>
              </div>
              
              <div>
                <span className="text-sm text-slate-400">Status: </span>
                <span className={instrument.in_use ? "text-emerald-400" : "text-red-400"}>
                  {instrument.in_use ? "In use" : "Not in use"}
                </span>
              </div>
            </div>
          </div>
  
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <LinkButton
              text="Back to Instruments"
              Icon={ArrowBigLeft}
              variant="secondary"
              link="/instruments"
            />
            <LinkButton
              text="Edit Instrument"
              Icon={Edit}
              variant="outline"
              link={`/instruments/${instrument.id}/edit`}
            />
          </div>
        </div>
      </Card>
    );
  }