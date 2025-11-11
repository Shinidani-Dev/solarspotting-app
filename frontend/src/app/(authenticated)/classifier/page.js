'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/api/apiClient';
import ImageFullscreen from '@/components/ui/images/ImageFullscreen';
import PatchesDisplay from '@/components/patches/PatchesDisplay';
import { Upload, Image as ImageIcon, Loader } from 'lucide-react';

export default function ClassifierPage() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [date, setDate] = useState('');
  const [patchSize, setPatchSize] = useState(512);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (uploadedImage && uploadedImage.url.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedImage.url);
      }
    };
  }, [uploadedImage]);

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
      // Cleanup old blob URL if it exists
      if (uploadedImage && uploadedImage.url.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedImage.url);
      }
      
      setFile(selectedFile);
      setError(null);
      setProcessedData(null); // Reset processed data when new file is selected
      setUploadedImage(null); // Reset uploaded image
      
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

  const handlePatchSizeChange = (e) => {
    setPatchSize(parseInt(e.target.value));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setProcessedData(null);

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
      
      // Fetch the image with auth token and create a blob URL
      const imageResponse = await apiClient.get(`/classifier/image/${response.data.filename}`, {
        responseType: 'blob'
      });
      
      const imageUrl = URL.createObjectURL(imageResponse.data);
      
      setUploadedImage({
        filename: response.data.filename,
        url: imageUrl,
        observation_datetime: response.data.observation_datetime
      });

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

  const handleProcess = async () => {
    if (!uploadedImage) {
      setError('Please upload an image first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('observation_date', uploadedImage.observation_datetime);
      formData.append('patch_size', patchSize.toString());

      const response = await apiClient.post(
        `/classifier/process/${uploadedImage.filename}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Convert base64 patches to data URLs for display
      const patches = response.data.patches.map((patch, index) => ({
        id: index,
        image_url: `data:image/jpeg;base64,${patch.image_base64}`,
        center_x: patch.px,
        center_y: patch.py,
        width: patchSize,
        height: patchSize,
        label: `Sunspot`,
        // Additional metadata
        sun_center_x: patch.center_x,
        sun_center_y: patch.center_y,
        sun_radius: patch.radius,
        filename: patch.filename,
        datetime: patch.datetime
      }));

      setProcessedData({
        patches,
        patches_count: response.data.patches_count,
        processed_by: response.data.processed_by
      });

      setMessage({
        type: 'success',
        text: `Processing complete! Found ${response.data.patches_count} sunspot patches.`
      });

    } catch (err) {
      console.error('Processing error:', err);
      setError(
        err.response?.data?.detail || 
        'Error processing image. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    // Cleanup blob URL if it exists
    if (uploadedImage && uploadedImage.url.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedImage.url);
    }
    
    setFile(null);
    setDate('');
    setPatchSize(512);
    setUploadedImage(null);
    setProcessedData(null);
    setMessage(null);
    setError(null);
    const fileInput = document.getElementById('file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen p-8 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-amber-400">
            Sunspot Classifier
          </h1>
          <p className="text-slate-400">
            Upload and process SDO HMI Images to detect sunspots
          </p>
        </div>

        {/* Upload Section */}
        <div className="p-8 mb-8 border rounded-lg shadow-lg bg-slate-800 border-slate-700">
          <h2 className="mb-6 text-xl font-semibold text-amber-400">
            <Upload className="inline mr-2" size={24} />
            Step 1: Upload Image
          </h2>

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

          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Input */}
            <div>
              <label htmlFor="file-input" className="block mb-2 text-sm font-medium text-slate-300">
                Select Image
              </label>
              <input
                id="file-input"
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="block w-full text-sm border rounded-lg cursor-pointer text-slate-400 bg-slate-700 border-slate-600 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-slate-900 hover:file:bg-amber-400"
              />
              {file && (
                <p className="mt-2 text-sm text-slate-400">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Date/Time Input */}
            <div>
              <label htmlFor="date-input" className="block mb-2 text-sm font-medium text-slate-300">
                Observation Date/Time
              </label>
              <input
                id="date-input"
                type="datetime-local"
                value={date}
                onChange={handleDateChange}
                className="block w-full px-3 py-2 text-sm border rounded-lg bg-slate-700 border-slate-600 text-slate-200 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>

            {/* Patch Size Input */}
            <div>
              <label htmlFor="patch-size-input" className="block mb-2 text-sm font-medium text-slate-300">
                Patch Size (pixels)
              </label>
              <input
                id="patch-size-input"
                type="number"
                min="64"
                max="2048"
                step="32"
                value={patchSize}
                onChange={handlePatchSizeChange}
                className="block w-full px-3 py-2 text-sm border rounded-lg bg-slate-700 border-slate-600 text-slate-200 focus:ring-amber-500 focus:border-amber-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                Size of extracted sunspot patches (64-2048, default: 512)
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isUploading || !file}
                className={`flex items-center px-6 py-2 rounded-md font-medium transition-colors
                  ${isUploading || !file
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 text-slate-900 hover:bg-amber-400'
                  }`}
              >
                {isUploading ? (
                  <>
                    <Loader size={16} className="mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Upload Image
                  </>
                )}
              </button>

              {uploadedImage && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 font-medium transition-colors rounded-md bg-slate-700 text-slate-300 hover:bg-slate-600"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Uploaded Image Display */}
        {uploadedImage && (
          <div className="p-8 mb-8 border rounded-lg shadow-lg bg-slate-800 border-slate-700">
            <h2 className="mb-6 text-xl font-semibold text-amber-400">
              <ImageIcon className="inline mr-2" size={24} />
              Uploaded Image
            </h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <ImageFullscreen 
                  src={uploadedImage.url} 
                  alt={`Uploaded image: ${uploadedImage.filename}`}
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-sm text-slate-400">Filename</p>
                  <p className="font-mono text-slate-200">{uploadedImage.filename}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-400">Observation Date/Time</p>
                  <p className="text-slate-200">
                    {new Date(uploadedImage.observation_datetime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm text-slate-400">Patch Size</p>
                  <p className="text-slate-200">{patchSize} × {patchSize} pixels</p>
                </div>
                
                {/* Process Button */}
                <button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-center px-6 py-3 rounded-md 
                             font-medium transition-colors mt-4
                    ${isProcessing
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-500'
                    }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader size={20} className="mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Image & Detect Sunspots'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processed Patches Display */}
        {processedData && (
          <PatchesDisplay 
            patches={processedData.patches}
            title="Detected Sunspot Patches"
            className="mb-8"
          />
        )}
      </div>
    </div>
  );
}