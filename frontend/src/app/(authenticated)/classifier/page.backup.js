'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/api/apiClient';

export default function ClassifierPage() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [date, setDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const parseFilenameDateTime = (filename) => {
    // Format: YYYYMMDD_HHMMSS_...
    // Beispiel: 20140405_103000_SDO_2048_00.jpg
    const pattern = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/;
    const match = filename.match(pattern);
    
    if (match) {
      const [_, year, month, day, hour, minute, second] = match;
      
      // Validierung
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      const hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      const secondNum = parseInt(second);
      
      if (monthNum >= 1 && monthNum <= 12 && 
          dayNum >= 1 && dayNum <= 31 &&
          hourNum >= 0 && hourNum <= 23 &&
          minuteNum >= 0 && minuteNum <= 59 &&
          secondNum >= 0 && secondNum <= 59) {
        
        // Format für datetime-local input: YYYY-MM-DDTHH:MM
        return `${year}-${month}-${day}T${hour}:${minute}`;
      }
    }
    
    return null;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      
      // Versuche Datum/Zeit aus Dateiname zu extrahieren
      const parsedDateTime = parseFilenameDateTime(selectedFile.name);
      if (parsedDateTime) {
        setDate(parsedDateTime);
        setMessage({
          type: 'info',
          text: `Date/Time automatically parsed: ${parsedDateTime.replace('T', ' ')}`
        });
      } else {
        // Wenn kein Datum erkannt wurde, aktuelles Datum vorschlagen
        const now = new Date();
        const currentDateTime = now.toISOString().slice(0, 16);
        setDate(currentDateTime);
      }
    }
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!file) {
      setError('Please choose an image');
      return;
    }

    if (!date) {
      setError('Please set a date and time');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('observation_date', date);

      const response = await apiClient.post('/classifier/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage({
        type: 'success',
        text: `Upload successful! File: ${response.data.filename}`
      });
      
      // Reset form
      setFile(null);
      setDate('');
      // Reset file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.detail || 
        'Error uploading file. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-slate-900">
      <div className="max-w-2xl mx-auto">
        <div className="p-8 border rounded-lg shadow-lg bg-slate-800 border-slate-700">
          <h1 className="mb-2 text-3xl font-bold text-amber-400">
            Classifier
          </h1>
          <p className="mb-8 text-slate-400">
            Upload an SDO HMI Image
          </p>

          {/* Success/Info Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg border-l-4 ${
              message.type === 'success' 
                ? 'bg-green-900/20 border-green-500' 
                : 'bg-blue-900/20 border-blue-500'
            }`}>
              <p className={message.type === 'success' ? 'text-green-400' : 'text-blue-400'}>
                {message.text}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 mb-6 border-l-4 border-red-500 rounded-lg bg-red-900/20">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Input */}
            <div>
              <label 
                htmlFor="file-input" 
                className="block mb-2 text-sm font-medium text-slate-300"
              >
                Select Image
                <span className="ml-2 font-normal text-slate-500">
                  (Date will bi parsed based on the file name)
                </span>
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.fits,.fit"
                className="block w-full text-sm cursor-pointer text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-slate-900 hover:file:bg-amber-400 file:cursor-pointer"
              />
              {file && (
                <p className="mt-2 text-sm text-slate-400">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* DateTime Input */}
            <div>
              <label 
                htmlFor="date-input" 
                className="block mb-2 text-sm font-medium text-slate-300"
              >
                Observation Date and Time
              </label>
              <input
                id="date-input"
                type="datetime-local"
                value={date}
                onChange={handleDateChange}
                className="w-full px-4 py-2 text-white border rounded-md bg-slate-700 border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Format: YYYY-MM-DD HH:MM
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading}
              className={`w-full py-3 px-4 rounded-md font-medium
                ${isUploading 
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                  : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                }`}
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </button>
          </form>

          {/* User Info */}
          {user && (
            <div className="pt-6 mt-8 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                Logged in as: <span className="text-amber-400">{user.username}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}