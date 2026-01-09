'use client';

import {useQuery} from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { userService } from '@/api/apiServices';
import Card from '@/components/ui/cards/Card';
import Heading from '@/components/ui/texts/Heading';
import LoadingIndicator from '@/components/ui/queryIndicators/LoadingIndicator';
import ErrorIndicator from '@/components/ui/queryIndicators/ErrorIndicator';
import { formatDate, formatDateTime } from '@/lib/helperFunctions';

export default function ProfilePage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['user'],
    queryFn: () => userService.getCurrentUser(),
  });

  if (isPending) {
    return <LoadingIndicator />;
  }

  if (isError) {
    return <ErrorIndicator error={error.info?.message || "Failed to load user data"} />;
  }

  const user = data;

  if (!user) {
    return (
      <div className="p-4 border-l-4 rounded-md bg-amber-500/10 border-amber-500">
        <p className="text-amber-400">No User Data Available</p>
      </div>
    );
  }

  return (
    <div>
      <Heading>Your Profile</Heading>
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Personal Information</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="mb-4">
              <p className="text-sm text-slate-400">Username</p>
              <p className="font-medium">{user.username}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Role</p>
              <p className="font-medium">
                {user.role === 'admin' ? 'Administrator' : 'User'}
                {user.is_labeler && ' (Labeler)'}
              </p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">First Name</p>
              <p className="font-medium">{user.firstname}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Last Name</p>
              <p className="font-medium">{user.lastname}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">E-Mail</p>
              <p className="font-medium">{user.email}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Date of Birth</p>
              <p className="font-medium">{formatDate(user.date_of_birth)}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Gender</p>
              <p className="font-medium">
                {user.gender === 'male' ? 'Male' : 'Female'}
              </p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Company</p>
              <p className="font-medium">{user.company || 'Not specified'}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Contact Data</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="mb-4">
              <p className="text-sm text-slate-400">Street</p>
              <p className="font-medium">{user.street}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Zip</p>
              <p className="font-medium">{user.postal_code}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">City</p>
              <p className="font-medium">{user.city}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Canton</p>
              <p className="font-medium">{user.state || 'Not specified'}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Country</p>
              <p className="font-medium">{user.country}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Phonenumber</p>
              <p className="font-medium">{user.phone || 'Not specified'}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Mobile</p>
              <p className="font-medium">{user.mobile || 'Not specified'}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Account Information</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="mb-4">
              <p className="text-sm text-slate-400">Account created at</p>
              <p className="font-medium">{formatDateTime(user.tstamp)}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400">Status</p>
              <div className="flex items-center mt-1">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${user.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span>{user.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}