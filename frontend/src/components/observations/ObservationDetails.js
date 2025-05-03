import React from 'react';
import Image from 'next/image';
import { formatDate } from '@/lib/helperFunctions';
import Card from '@/components/ui/cards/Card';
import CardWrapper from '@/components/ui/cards/CardWrapper';
import Button from '@/components/ui/buttons/Button';
import { ArrowBigLeft, Edit, Loader } from 'lucide-react';
import Link from 'next/link';

export default function ObservationDetails({ 
  observation, 
  instrument, 
  dayData, 
  groupData, 
  isLoadingSecondaryData,
  currentUser 
}) {
  // Determine if user can edit this observation
  const canEdit = currentUser && 
    (observation.observer_id === currentUser.id || currentUser.is_labeler);
  
  // Default image paths in public folder
  const defaultImagePath = '/images/placeholder.jpg';

  // Image sources with fallbacks
  const sdoImageSrc = observation.sdo_image || defaultImagePath;
  const protocolImageSrc = observation.daily_protocol || defaultImagePath;
  
  return (
    <div className="space-y-6">
      {/* Images section */}
      <CardWrapper>
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-amber-400">SDO Image</h3>
          <div className="relative w-full overflow-hidden rounded-lg aspect-video bg-slate-700">
            <Image
              src={sdoImageSrc}
              alt="Solar SDO Image"
              fill
              style={{ objectFit: 'contain' }}
              priority
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultSdoImagePath;
              }}
            />
          </div>
        </Card>
        
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-amber-400">Daily Protocol</h3>
          <div className="relative w-full overflow-hidden rounded-lg aspect-video bg-slate-700">
            <Image
              src={protocolImageSrc}
              alt="Daily Protocol"
              fill
              style={{ objectFit: 'contain' }}
              priority
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultProtocolImagePath;
              }}
            />
          </div>
        </Card>
      </CardWrapper>
      
      {/* Basic observation information */}
      <Card>
        <div className="pb-4 mb-4 border-b border-slate-700">
          <h3 className="text-xl font-bold text-amber-400">Observation Details</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm text-slate-400">Date</p>
            <p>{formatDate(observation.created)}</p>
          </div>
          
          <div>
            <p className="mb-1 text-sm text-slate-400">Instrument</p>
            {isLoadingSecondaryData && !instrument ? (
              <div className="flex items-center">
                <Loader size={16} className="mr-2 animate-spin" />
                <span>Loading instrument data...</span>
              </div>
            ) : instrument ? (
              <p>{instrument.i_type || `Instrument #${observation.instrument_id}`}</p>
            ) : (
              <p>Instrument #{observation.instrument_id}</p>
            )}
          </div>
          
          <div className="md:col-span-2">
            <p className="mb-1 text-sm text-slate-400">Notes</p>
            <div className="p-3 rounded-md bg-slate-700/30">
              <p>{observation.notes || 'No notes provided'}</p>
            </div>
          </div>
          
          <div>
            <p className="mb-1 text-sm text-slate-400">Status</p>
            <span className={`px-2 py-1 text-xs rounded-full ${
              observation.status === 'draft' 
                ? 'bg-yellow-900/30 text-yellow-400' 
                : 'bg-emerald-900/30 text-emerald-400'
            }`}>
              {observation.status}
            </span>
          </div>
          
          <div>
            <p className="mb-1 text-sm text-slate-400">Public</p>
            <span className={`px-2 py-1 text-xs rounded-full ${
              observation.is_public 
                ? 'bg-emerald-900/30 text-emerald-400' 
                : 'bg-slate-700/50 text-slate-400'
            }`}>
              {observation.is_public ? 'Public' : 'Private'}
            </span>
          </div>
          
          {currentUser && currentUser.is_labeler && (
            <div>
              <p className="mb-1 text-sm text-slate-400">Verified</p>
              <span className={`px-2 py-1 text-xs rounded-full ${
                observation.verified 
                  ? 'bg-emerald-900/30 text-emerald-400' 
                  : 'bg-slate-700/50 text-slate-400'
              }`}>
                {observation.verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          )}
        </div>
      </Card>
      
      {/* Summary of groups and spots */}
      {(isLoadingSecondaryData && !dayData) ? (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="mr-3 animate-spin" />
            <span>Loading observation summary...</span>
          </div>
        </Card>
      ) : dayData ? (
        <Card>
          <div className="pb-4 mb-4 border-b border-slate-700">
            <h3 className="text-xl font-bold text-amber-400">Observation Summary</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm text-slate-400">Number of Groups</p>
              <p className="text-xl font-semibold text-amber-300">{dayData.d_gruppen || 0}</p>
            </div>
            
            <div>
              <p className="mb-1 text-sm text-slate-400">Number of Spots</p>
              <p className="text-xl font-semibold text-amber-300">{dayData.d_flecken || 0}</p>
            </div>
          </div>
        </Card>
      ) : null}
      
      {/* Group data entries */}
      {(isLoadingSecondaryData && !groupData) ? (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="mr-3 animate-spin" />
            <span>Loading sunspot group data...</span>
          </div>
        </Card>
      ) : groupData && groupData.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-amber-400">Sunspot Groups</h3>
          
          {groupData.map((group, index) => (
            <Card key={group.id || index}>
              <h4 className="mb-3 text-lg font-semibold text-amber-400">
                Group #{index + 1}
              </h4>
              
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                <div>
                  <p className="mb-1 text-xs text-slate-400">Code</p>
                  <p>{group.g_code || '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">Date</p>
                  <p>{group.g_date ? formatDate(group.g_date) : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">UT</p>
                  <p>{group.g_ut !== null ? group.g_ut : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">Quality</p>
                  <p>{group.g_q !== null ? group.g_q : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">Number</p>
                  <p>{group.g_nr !== null ? group.g_nr : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">F</p>
                  <p>{group.g_f !== null ? group.g_f : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">ZPD</p>
                  <p>{group.g_zpd || '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">P</p>
                  <p>{group.g_p !== null ? group.g_p : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">S</p>
                  <p>{group.g_s !== null ? group.g_s : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">Sector</p>
                  <p>{group.g_sector !== null ? group.g_sector : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">A</p>
                  <p>{group.g_a !== null ? group.g_a : '-'}</p>
                </div>
                
                <div>
                  <p className="mb-1 text-xs text-slate-400">Position</p>
                  <p>{group.g_pos || '-'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
      
      {/* Day data (detailed) */}
      {(isLoadingSecondaryData && !dayData) ? (
        <Card>
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="mr-3 animate-spin" />
            <span>Loading day data...</span>
          </div>
        </Card>
      ) : dayData ? (
        <Card>
          <div className="pb-4 mb-4 border-b border-slate-700">
            <h3 className="text-xl font-bold text-amber-400">Day Data</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <p className="mb-1 text-xs text-slate-400">Code</p>
              <p>{dayData.d_code}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">Date</p>
              <p>{formatDate(dayData.d_date)}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">UT</p>
              <p>{dayData.d_ut !== null ? dayData.d_ut : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">Quality</p>
              <p>{dayData.d_q !== null ? dayData.d_q : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">Groups</p>
              <p>{dayData.d_gruppen !== null ? dayData.d_gruppen : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">Spots</p>
              <p>{dayData.d_flecken !== null ? dayData.d_flecken : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">A</p>
              <p>{dayData.d_a !== null ? dayData.d_a : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">B</p>
              <p>{dayData.d_b !== null ? dayData.d_b : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">C</p>
              <p>{dayData.d_c !== null ? dayData.d_c : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">D</p>
              <p>{dayData.d_d !== null ? dayData.d_d : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">E</p>
              <p>{dayData.d_e !== null ? dayData.d_e : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">F</p>
              <p>{dayData.d_f !== null ? dayData.d_f : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">G</p>
              <p>{dayData.d_g !== null ? dayData.d_g : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">H</p>
              <p>{dayData.d_h !== null ? dayData.d_h : '-'}</p>
            </div>
            
            <div>
              <p className="mb-1 text-xs text-slate-400">J</p>
              <p>{dayData.d_j !== null ? dayData.d_j : '-'}</p>
            </div>
          </div>
        </Card>
      ) : null}
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 pt-4">
        <Link href="/observations">
          <Button variant="secondary">
            <ArrowBigLeft className="mr-2" size={18} />
            Back to Observations
          </Button>
        </Link>
        
        {canEdit && (
          <Link href={`/observations/${observation.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2" size={18} />
              Edit Observation
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}