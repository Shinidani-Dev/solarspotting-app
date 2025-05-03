import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Card from "../ui/cards/Card";
import Button from "../ui/buttons/Button";
import { instrumentService } from "@/api/apiServices";
import { getUserData } from "@/lib/auth";
import FormField from "../ui/forms/FormField";

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
    in_use: true,
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
        in_use: instrument.in_use,
      });
    } else if (!isEdit) {
      const userData = getUserData();
      const userId = userData.id;
      setFormData((prev) => ({
        ...prev,
        observer_id: userId,
      }));
    }
  }, [instrument, isEdit]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => instrumentService.createInstrument(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instruments"] });
      router.push("/instruments");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => instrumentService.updateInstrument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instruments"] });
      queryClient.invalidateQueries({
        queryKey: ["instrument", instrument?.id],
      });
      router.push("/instruments");
    },
  });

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Convert numeric string inputs to numbers
    const numericFields = [
      "i_aperture",
      "i_focal_length",
      "i_magnification",
      "i_projection",
      "i_inputpref",
    ];

    let processedValue = value;
    if (type === "checkbox") {
      processedValue = checked;
    } else if (numericFields.includes(name) && value !== "") {
      processedValue = parseInt(value, 10);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
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
      { name: "i_aperture", label: "Aperture" },
      { name: "i_focal_length", label: "Focal Length" },
      { name: "i_magnification", label: "Magnification" },
      { name: "i_projection", label: "Projection" },
      { name: "i_inputpref", label: "Input Preference" },
    ];

    numericFields.forEach((field) => {
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
      Object.entries(formData).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
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
        <FormField
          id="i_type"
          name="i_type"
          label="Instrument Type"
          value={formData.i_type}
          onChange={handleChange}
          error={errors.i_type}
        />

        <FormField
          id="i_id"
          name="i_id"
          label="Serial Number"
          value={formData.i_id}
          onChange={handleChange}
          error={errors.i_id}
        />

        {/* Two column layout for numeric inputs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="i_aperture"
            name="i_aperture"
            label="Aperture (mm)"
            type="number"
            value={formData.i_aperture}
            onChange={handleChange}
            error={errors.i_aperture}
          />

          <FormField
            id="i_focal_length"
            name="i_focal_length"
            label="Focal Length (mm)"
            type="number"
            value={formData.i_focal_length}
            onChange={handleChange}
            error={errors.i_focal_length}
          />

          <FormField
            id="i_magnification"
            name="i_magnification"
            label="Magnification"
            type="number"
            value={formData.i_magnification}
            onChange={handleChange}
            error={errors.i_magnification}
          />

          <FormField
            id="i_projection"
            name="i_projection"
            label="Projection"
            type="number"
            value={formData.i_projection}
            onChange={handleChange}
            error={errors.i_projection}
          />
        </div>

        <FormField
          id="i_filter"
          name="i_filter"
          label="Filter"
          value={formData.i_filter}
          onChange={handleChange}
          error={errors.i_filter}
        />

        <FormField
          id="i_method"
          name="i_method"
          label="Method"
          value={formData.i_method}
          onChange={handleChange}
          error={errors.i_method}
        />

        <FormField
          id="i_inputpref"
          name="i_inputpref"
          label="Input Preference"
          type="number"
          value={formData.i_inputpref}
          onChange={handleChange}
          error={errors.i_inputpref}
        />

        <FormField
          id="in_use"
          name="in_use"
          label="Instrument is in use"
          type="checkbox"
          value={formData.in_use}
          onChange={handleChange}
          error={errors.in_use}
        />

        {/* Form Actions */}
        <div className="flex pt-2 space-x-4">
          <Button type="submit" disabled={isLoading} variant="primary">
            {isLoading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
              ? "Update Instrument"
              : "Create Instrument"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/instruments")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
