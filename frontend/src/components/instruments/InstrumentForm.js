import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "../ui/cards/Card";
import Button from "../ui/buttons/Button";
import { instrumentService } from "@/api/apiServices";
import { getUserData } from "@/lib/auth";

export default function InstrumentForm({ instrument = null, isEdit = false }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    i_id: "",
    i_type: "",
    i_aperture: "",
    i_focal_length: "",
    i_filter: "",
    i_method: "",
    i_magnification: "",
    i_projection: "",
    i_inputpref: "",
    in_use: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit && instrument) {
      setFormData({
        i_id: instrument.i_id || "",
        i_type: instrument.i_type || "",
        i_aperture: instrument.i_aperture || "",
        i_focal_length: instrument.i_focal_length || "",
        i_filter: instrument.i_filter || "",
        i_method: instrument.i_method || "",
        i_magnification: instrument.i_magnification || "",
        i_projection: instrument.i_projection || "",
        i_inputpref: instrument.i_inputpref || "",
        in_use: instrument.in_use
      });
    } else if (!isEdit) {
        const userData = getUserData();
        const userId = userData.id;
        setFormData(prev => ({
        ...prev,
        observer_id: userId
      }));
    }
  }, [instrument, isEdit]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => instrumentService.createInstrument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      router.push('/instruments');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => instrumentService.updateInstrument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instruments'] });
      queryClient.invalidateQueries({ queryKey: ['instrument', instrument?.id] });
      router.push('/instruments');
    }
  });

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Convert numeric string inputs to numbers
    const numericFields = ['i_aperture', 'i_focal_length', 'i_magnification', 'i_projection', 'i_inputpref'];
    
    let processedValue = value;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (numericFields.includes(name) && value !== "") {
      processedValue = parseInt(value, 10);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Add validation rules as needed
    if (formData.i_type && formData.i_type.length > 100) {
      newErrors.i_type = "Type must be less than 100 characters";
    }
    
    // Validate numeric fields have valid numbers if provided
    const numericFields = [
      { name: 'i_aperture', label: 'Aperture' },
      { name: 'i_focal_length', label: 'Focal Length' },
      { name: 'i_magnification', label: 'Magnification' },
      { name: 'i_projection', label: 'Projection' },
      { name: 'i_inputpref', label: 'Input Preference' }
    ];
    
    numericFields.forEach(field => {
      if (formData[field.name] && isNaN(parseInt(formData[field.name], 10))) {
        newErrors[field.name] = `${field.label} must be a valid number`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Prepare data by removing empty strings
    const submitData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, value === "" ? null : value])
    );
    
    if (isEdit && instrument) {
      updateMutation.mutate({ id: instrument.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Determine if form is in loading state
  const isLoading = createMutation.isPending || updateMutation.isPending;
  
  // Determine any errors from mutations
  const mutationError = createMutation.error || updateMutation.error;

  return (
    <Card>
      <h2 className="mb-4 text-xl font-bold text-amber-400">
        {isEdit ? "Edit Instrument" : "Create New Instrument"}
      </h2>
      
      {mutationError && (
        <div className="p-3 mb-4 border-l-4 border-red-500 rounded bg-red-900/20">
          <p className="text-sm text-red-400">
            {mutationError.response?.data?.detail || "An error occurred"}
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Instrument Type */}
        <div>
          <label className="form-label" htmlFor="i_type">
            Instrument Type
          </label>
          <input
            id="i_type"
            name="i_type"
            type="text"
            value={formData.i_type}
            onChange={handleChange}
            className="form-input"
          />
          {errors.i_type && (
            <p className="error-msg">{errors.i_type}</p>
          )}
        </div>
        
        {/* Instrument ID */}
        <div>
          <label className="form-label" htmlFor="i_id">
            Serial Number
          </label>
          <input
            id="i_id"
            name="i_id"
            type="text"
            value={formData.i_id}
            onChange={handleChange}
            className="form-input"
          />
          {errors.i_id && (
            <p className="error-msg">{errors.i_id}</p>
          )}
        </div>
        
        {/* Two column layout for numeric inputs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Aperture */}
          <div>
            <label className="form-label" htmlFor="i_aperture">
              Aperture (mm)
            </label>
            <input
              id="i_aperture"
              name="i_aperture"
              type="number"
              value={formData.i_aperture}
              onChange={handleChange}
              className="form-input"
            />
            {errors.i_aperture && (
              <p className="error-msg">{errors.i_aperture}</p>
            )}
          </div>
          
          {/* Focal Length */}
          <div>
            <label className="form-label" htmlFor="i_focal_length">
              Focal Length (mm)
            </label>
            <input
              id="i_focal_length"
              name="i_focal_length"
              type="number"
              value={formData.i_focal_length}
              onChange={handleChange}
              className="form-input"
            />
            {errors.i_focal_length && (
              <p className="error-msg">{errors.i_focal_length}</p>
            )}
          </div>
          
          {/* Magnification */}
          <div>
            <label className="form-label" htmlFor="i_magnification">
              Magnification
            </label>
            <input
              id="i_magnification"
              name="i_magnification"
              type="number"
              value={formData.i_magnification}
              onChange={handleChange}
              className="form-input"
            />
            {errors.i_magnification && (
              <p className="error-msg">{errors.i_magnification}</p>
            )}
          </div>
          
          {/* Projection */}
          <div>
            <label className="form-label" htmlFor="i_projection">
              Projection
            </label>
            <input
              id="i_projection"
              name="i_projection"
              type="number"
              value={formData.i_projection}
              onChange={handleChange}
              className="form-input"
            />
            {errors.i_projection && (
              <p className="error-msg">{errors.i_projection}</p>
            )}
          </div>
        </div>
        
        {/* Filter */}
        <div>
          <label className="form-label" htmlFor="i_filter">
            Filter
          </label>
          <input
            id="i_filter"
            name="i_filter"
            type="text"
            value={formData.i_filter}
            onChange={handleChange}
            className="form-input"
          />
          {errors.i_filter && (
            <p className="error-msg">{errors.i_filter}</p>
          )}
        </div>
        
        {/* Method */}
        <div>
          <label className="form-label" htmlFor="i_method">
            Method
          </label>
          <input
            id="i_method"
            name="i_method"
            type="text"
            value={formData.i_method}
            onChange={handleChange}
            className="form-input"
          />
          {errors.i_method && (
            <p className="error-msg">{errors.i_method}</p>
          )}
        </div>
        
        {/* Input Preference */}
        <div>
          <label className="form-label" htmlFor="i_inputpref">
            Input Preference
          </label>
          <input
            id="i_inputpref"
            name="i_inputpref"
            type="number"
            value={formData.i_inputpref}
            onChange={handleChange}
            className="form-input"
          />
          {errors.i_inputpref && (
            <p className="error-msg">{errors.i_inputpref}</p>
          )}
        </div>
        
        {/* In Use Checkbox */}
        <div className="flex items-center py-2 space-x-2">
          <input
            id="in_use"
            name="in_use"
            type="checkbox"
            checked={formData.in_use}
            onChange={handleChange}
            className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
          />
          <label className="mb-0 form-label" htmlFor="in_use">
            Instrument is in use
          </label>
        </div>
        
        {/* Form Actions */}
        <div className="flex pt-2 space-x-4">
          <Button
            type="submit"
            disabled={isLoading}
            variant="primary"
          >
            {isLoading 
              ? (isEdit ? "Updating..." : "Creating...") 
              : (isEdit ? "Update Instrument" : "Create Instrument")}
          </Button>
          
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/instruments')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}