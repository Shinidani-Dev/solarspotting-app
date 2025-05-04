import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Card from "../ui/cards/Card";
import Button from "@/components/ui/buttons/Button";
import FormField from "@/components/ui/forms/FormField";
import ErrorIndicator from "../ui/queryIndicators/ErrorIndicator";
import LoadingIndicator from "../ui/queryIndicators/LoadingIndicator";
import {
  instrumentService,
  observationService,
  dayDataService,
  groupDataService,
} from "@/api/apiServices";
import { Trash2, Plus, Upload, Loader, FileText } from "lucide-react";
import { formatDate } from "@/lib/helperFunctions";
import { getUserData } from "@/lib/auth";

// Helper function to calculate day data from group data
const calculateDayData = (groupData, totalGroups, totalSpots) => {
  // This is a placeholder function that will be replaced with actual business logic later
  return {
    d_code: 1, // Default code
    d_date: new Date().toISOString().split("T")[0], // Today's date
    d_ut: 12, // Default UT time
    d_q: 3, // Default quality
    d_gruppen: totalGroups,
    d_flecken: totalSpots,
    d_a: 0,
    d_b: 0,
    d_c: 0,
    d_d: 0,
    d_e: 0,
    d_f: 0,
    d_g: 0,
    d_h: 0,
    d_j: 0,
  };
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};

export default function ObservationForm({
  observation = null,
  dayData = null,
  groupData = null,
  isEdit = false,
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // State for file uploads
  const [sdoImage, setSdoImage] = useState(null);
  const [sdoImagePreview, setSdoImagePreview] = useState(null);
  const [dailyProtocol, setDailyProtocol] = useState(null);
  const [dailyProtocolPreview, setDailyProtocolPreview] = useState(null);

  // Loading state for submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Main form state
  const [formData, setFormData] = useState({
    observer_id: user?.id,
    instrument_id: "",
    notes: "",
    status: "draft",
    is_public: false,
    sdo_image: "",
    daily_protocol: "",
    verified: false,
    created: getTodayDate(),
  });

  // Group data state
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalSpots, setTotalSpots] = useState(0);
  const [groupDataState, setGroupDataState] = useState([]);

  // For tracking deleted groups during edit
  const [deletedGroupIds, setDeletedGroupIds] = useState([]);

  // Calculated day data (will be updated when group data changes)
  const [dayDataState, setDayDataState] = useState(calculateDayData([], 0, 0));

  // Form errors state
  const [errors, setErrors] = useState({});

  // Fetch instruments for dropdown
  const { data: instruments, isLoading: loadingInstruments } = useQuery({
    queryKey: ["instruments"],
    queryFn: instrumentService.getMyInstruments,
    enabled: !!user,
  });

  useEffect(() => {
    if (isEdit && observation) {
      console.log("Initializing form data with observation:", observation);
      
      // Set observation data with ALL fields, being explicit about defaults
      setFormData({
        observer_id: observation.observer_id,
        instrument_id: observation.instrument_id ? observation.instrument_id.toString() : '',
        notes: observation.notes !== null ? observation.notes : '',
        status: observation.status || 'draft',
        is_public: observation.is_public === true, // Explicit boolean conversion
        sdo_image: observation.sdo_image || '',
        daily_protocol: observation.daily_protocol || '',
        verified: observation.verified === true, // Explicit boolean conversion
        created: observation.created 
          ? new Date(observation.created).toISOString().split("T")[0] 
          : getTodayDate()
      });
      
      console.log("Form data initialized with values:", {
        instrument_id: observation.instrument_id,
        is_public: observation.is_public,
        verified: observation.verified,
        notes: observation.notes
      });
      
      // Set image previews if available
      if (observation.sdo_image) {
        setSdoImagePreview(observation.sdo_image);
      }
      if (observation.daily_protocol) {
        setDailyProtocolPreview(observation.daily_protocol);
      }
    }
  }, [isEdit, observation]);

  // Set default instrument when instruments load
  useEffect(() => {
    if (instruments?.length > 0 && !formData.instrument_id) {
      // First try to find an instrument with in_use = true
      const activeInstrument = instruments.find(
        (instrument) => instrument.in_use === true
      );

      // If no active instrument found, use the first one
      const defaultInstrument = activeInstrument || instruments[0];

      setFormData((prev) => ({
        ...prev,
        instrument_id: defaultInstrument.id,
      }));
    }
  }, [instruments, formData.instrument_id]);

  // Initialize day data if editing
  useEffect(() => {
    if (isEdit && dayData) {
      setDayDataState({
        d_code: dayData.d_code,
        d_date: dayData.d_date
          ? new Date(dayData.d_date).toISOString().split("T")[0]
          : getTodayDate(),
        d_ut: dayData.d_ut || null,
        d_q: dayData.d_q || null,
        d_gruppen: dayData.d_gruppen || 0,
        d_flecken: dayData.d_flecken || 0,
        d_a: dayData.d_a || 0,
        d_b: dayData.d_b || 0,
        d_c: dayData.d_c || 0,
        d_d: dayData.d_d || 0,
        d_e: dayData.d_e || 0,
        d_f: dayData.d_f || 0,
        d_g: dayData.d_g || 0,
        d_h: dayData.d_h || 0,
        d_j: dayData.d_j || 0,
      });

      setTotalGroups(dayData.d_gruppen || 0);
      setTotalSpots(dayData.d_flecken || 0);
    }
  }, [isEdit, dayData]);

  // Initialize group data if editing
  useEffect(() => {
    if (isEdit && groupData?.length > 0) {
      setGroupDataState(
        groupData.map((group) => ({
          id: group.id,
          g_code: group.g_code,
          g_date: group.g_date
            ? new Date(group.g_date).toISOString().split("T")[0]
            : getTodayDate(),
          g_ut: group.g_ut || null,
          g_q: group.g_q || null,
          g_nr: group.g_nr || null,
          g_f: group.g_f || null,
          g_zpd: group.g_zpd || "",
          g_p: group.g_p || null,
          g_s: group.g_s || null,
          g_sector: group.g_sector || null,
          g_a: group.g_a || null,
          g_pos: group.g_pos || "",
          day_data_id: group.day_data_id,
          observation_id: group.observation_id,
        }))
      );

      setTotalGroups(groupData.length);

      // Also set total spots if available from day data
      if (dayData?.d_flecken) {
        setTotalSpots(dayData.d_flecken);
      }
    }
  }, [isEdit, groupData, dayData]);

  // Update day data whenever group data changes
  useEffect(() => {
    setDayDataState((prev) => ({
      ...prev,
      d_gruppen: totalGroups,
      d_flecken: totalSpots,
    }));
  }, [totalGroups, totalSpots]);

  // Create mutation for new observation
  const createMutation = useMutation({
    mutationFn: (data) => observationService.createDetailedObservation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["observations"] });
      router.push("/observations");
    },
    onError: (error) => {
      console.error("Create mutation error:", error);
      // Error will be handled in try/catch
    },
  });

  // Individual mutations for edit mode
  const updateObservationMutation = useMutation({
    mutationFn: ({ id, data }) =>
      observationService.updateObservation(id, data),
    onError: (error) => console.error("Update observation error:", error),
  });

  const updateDayDataMutation = useMutation({
    mutationFn: ({ id, data }) => dayDataService.updateDayData(id, data),
    onError: (error) => console.error("Update day data error:", error),
  });

  const createGroupDataMutation = useMutation({
    mutationFn: (data) => groupDataService.createGroupData(data),
    onError: (error) => console.error("Create group data error:", error),
  });

  const updateGroupDataMutation = useMutation({
    mutationFn: ({ id, data }) => groupDataService.updateGroupData(id, data),
    onError: (error) => console.error("Update group data error:", error),
  });

  const deleteGroupDataMutation = useMutation({
    mutationFn: (id) => groupDataService.deleteGroupData(id),
    onError: (error) => console.error("Delete group data error:", error),
  });

  // Handle file selection for SDO image
  const handleSdoImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSdoImage(file);
      const fileUrl = URL.createObjectURL(file);
      setSdoImagePreview(fileUrl);
    }
  };

  // Handle file selection for daily protocol
  const handleDailyProtocolChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDailyProtocol(file);
      const fileUrl = URL.createObjectURL(file);
      setDailyProtocolPreview(fileUrl);
    }
  };

  // Handle input changes for the main form
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Add a new group data entry
  const addGroupData = () => {
    const newGroup = {
      g_code: 1, // Default code
      g_date: getTodayDate(),
      g_ut: null,
      g_q: null,
      g_nr: null,
      g_f: null,
      g_zpd: "",
      g_p: null,
      g_s: null,
      g_sector: null,
      g_a: null,
      g_pos: "",
      // IDs will be assigned by the server for new groups
      day_data_id: isEdit ? dayData?.id : null,
      observation_id: isEdit ? observation?.id : null,
    };

    setGroupDataState((prev) => [...prev, newGroup]);
    setTotalGroups((prev) => prev + 1);
  };

  // Remove a group data entry
  const removeGroupData = (index) => {
    const groupToRemove = groupDataState[index];

    // If this is an existing group (has an ID), track it for deletion
    if (isEdit && groupToRemove.id) {
      setDeletedGroupIds((prev) => [...prev, groupToRemove.id]);
    }

    setGroupDataState((prev) => prev.filter((_, i) => i !== index));
    setTotalGroups((prev) => prev - 1);
  };

  // Handle changes to group data fields
  const handleGroupDataChange = (index, name, value) => {
    setGroupDataState((prev) => {
      const updatedGroups = [...prev];
      updatedGroups[index] = {
        ...updatedGroups[index],
        [name]: value,
      };
      return updatedGroups;
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.instrument_id) {
      newErrors.instrument_id = "Please select an instrument";
    }

    if (totalGroups > 0 && groupDataState.length !== totalGroups) {
      newErrors.totalGroups =
        "The number of group entries does not match the total groups specified";
    }

    // Additional validation can be added here

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle file uploads
  const uploadFiles = async () => {
    let sdoImagePath = formData.sdo_image;
    let dailyProtocolPath = formData.daily_protocol;

    if (sdoImage) {
      try {
        const result = await observationService.uploadFile(sdoImage, "sdo");
        if (result && result.filePath) {
          sdoImagePath = result.filePath;
        } else {
          throw new Error("Failed to get file path from upload response");
        }
      } catch (error) {
        console.error("Error uploading SDO image:", error);
        throw new Error("Failed to upload image");
      }
    }

    if (dailyProtocol) {
      try {
        const result = await observationService.uploadFile(
          dailyProtocol,
          "protocol"
        );
        if (result && result.filePath) {
          dailyProtocolPath = result.filePath;
        } else {
          throw new Error("Failed to get file path from upload response");
        }
      } catch (error) {
        console.error("Error uploading daily protocol:", error);
        throw new Error("Failed to upload PDF");
      }
    }

    return { sdoImagePath, dailyProtocolPath };
  };

  // Handle create mode submission
  const handleCreate = async () => {
    try {
      // First upload any files
      const { sdoImagePath, dailyProtocolPath } = await uploadFiles();

      const userData = getUserData();

      if (!userData || !userData.id) {
        throw new Error("User data is missing. Please try logging in again.");
      }

      // Prepare submission data
      const submissionData = {
        observation: {
          ...formData,
          observer_id: userData.id,
          sdo_image: sdoImagePath,
          daily_protocol: dailyProtocolPath,
          instrument_id: parseInt(formData.instrument_id, 10),
        },
        day_data: {
          ...dayDataState,
          d_gruppen: totalGroups,
          d_flecken: totalSpots,
        },
        group_data: groupDataState.map((group) => ({
          ...group,
          // Convert numeric fields to numbers - with extra validation
          g_code: parseInt(group.g_code, 10) || 1,
          g_ut:
            group.g_ut !== null && group.g_ut !== ""
              ? parseInt(group.g_ut, 10)
              : null,
          g_q:
            group.g_q !== null && group.g_q !== ""
              ? parseInt(group.g_q, 10)
              : null,
          g_nr:
            group.g_nr !== null && group.g_nr !== ""
              ? parseInt(group.g_nr, 10)
              : null,
          g_f:
            group.g_f !== null && group.g_f !== ""
              ? parseInt(group.g_f, 10)
              : null,
          g_p:
            group.g_p !== null && group.g_p !== ""
              ? parseInt(group.g_p, 10)
              : null,
          g_s:
            group.g_s !== null && group.g_s !== ""
              ? parseInt(group.g_s, 10)
              : null,
          g_sector:
            group.g_sector !== null && group.g_sector !== ""
              ? parseInt(group.g_sector, 10)
              : null,
          g_a:
            group.g_a !== null && group.g_a !== ""
              ? parseInt(group.g_a, 10)
              : null,
        })),
      };

      // Create everything in one API call
      await createMutation.mutateAsync(submissionData);
    } catch (error) {
      console.error("Error in handleCreate:", error);
      throw error;
    }
  };

  // Handle edit mode submission (coordinated updates)
  const handleUpdate = async () => {
    try {
      // First upload any files
      const { sdoImagePath, dailyProtocolPath } = await uploadFiles();

      const userData = getUserData();

      if (!userData || !userData.id) {
        throw new Error("User data is missing. Please try logging in again.");
      }

      // 1. Update observation data
      const observationData = {
        ...formData,
        observer_id: userData.id,
        sdo_image: sdoImagePath,
        daily_protocol: dailyProtocolPath,
        instrument_id: parseInt(formData.instrument_id, 10),
      };

      await updateObservationMutation.mutateAsync({
        id: observation.id,
        data: observationData,
      });

      // 2. Update day data
      const dayDataUpdateObj = {
        ...dayDataState,
        d_gruppen: totalGroups,
        d_flecken: totalSpots,
      };

      await updateDayDataMutation.mutateAsync({
        id: dayData.id,
        data: dayDataUpdateObj,
      });

      // 3. Handle group data changes

      // a. Delete removed groups
      const deletePromises = deletedGroupIds.map((id) =>
        deleteGroupDataMutation.mutateAsync(id)
      );
      await Promise.all(deletePromises);

      // b. Process remaining groups - update existing ones and create new ones
      const updatePromises = groupDataState.map(async (group) => {
        if (group.id) {
          // Update existing group
          await updateGroupDataMutation.mutateAsync({
            id: group.id,
            data: {
              ...group,
              g_code: parseInt(group.g_code, 10) || 1,
              g_ut:
                group.g_ut !== null && group.g_ut !== ""
                  ? parseInt(group.g_ut, 10)
                  : null,
              g_q:
                group.g_q !== null && group.g_q !== ""
                  ? parseInt(group.g_q, 10)
                  : null,
              g_nr:
                group.g_nr !== null && group.g_nr !== ""
                  ? parseInt(group.g_nr, 10)
                  : null,
              g_f:
                group.g_f !== null && group.g_f !== ""
                  ? parseInt(group.g_f, 10)
                  : null,
              g_p:
                group.g_p !== null && group.g_p !== ""
                  ? parseInt(group.g_p, 10)
                  : null,
              g_s:
                group.g_s !== null && group.g_s !== ""
                  ? parseInt(group.g_s, 10)
                  : null,
              g_sector:
                group.g_sector !== null && group.g_sector !== ""
                  ? parseInt(group.g_sector, 10)
                  : null,
              g_a:
                group.g_a !== null && group.g_a !== ""
                  ? parseInt(group.g_a, 10)
                  : null,
            },
          });
        } else {
          // Create new group
          await createGroupDataMutation.mutateAsync({
            ...group,
            g_code: parseInt(group.g_code, 10) || 1,
            g_ut:
              group.g_ut !== null && group.g_ut !== ""
                ? parseInt(group.g_ut, 10)
                : null,
            g_q:
              group.g_q !== null && group.g_q !== ""
                ? parseInt(group.g_q, 10)
                : null,
            g_nr:
              group.g_nr !== null && group.g_nr !== ""
                ? parseInt(group.g_nr, 10)
                : null,
            g_f:
              group.g_f !== null && group.g_f !== ""
                ? parseInt(group.g_f, 10)
                : null,
            g_p:
              group.g_p !== null && group.g_p !== ""
                ? parseInt(group.g_p, 10)
                : null,
            g_s:
              group.g_s !== null && group.g_s !== ""
                ? parseInt(group.g_s, 10)
                : null,
            g_sector:
              group.g_sector !== null && group.g_sector !== ""
                ? parseInt(group.g_sector, 10)
                : null,
            g_a:
              group.g_a !== null && group.g_a !== ""
                ? parseInt(group.g_a, 10)
                : null,
            observation_id: observation.id,
            day_data_id: dayData.id,
          });
        }
      });

      await Promise.all(updatePromises);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["observations"] });
      queryClient.invalidateQueries({
        queryKey: ["detailedObservation", observation.id],
      });

      // Redirect back to observations list
      router.push("/observations");
    } catch (error) {
      console.error("Error in handleUpdate:", error);
      throw error;
    }
  };

  // Main form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Show loading state
    setIsSubmitting(true);
    setErrors({});

    try {
      if (isEdit) {
        await handleUpdate();
      } else {
        await handleCreate();
      }

      // Success - navigation handled in the specific handlers
    } catch (error) {
      // Parse error message
      let errorMessage = "An error occurred while saving the observation.";

      if (error.response?.data?.detail) {
        errorMessage =
          typeof error.response.data.detail === "string"
            ? error.response.data.detail
            : JSON.stringify(error.response.data.detail);
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors((prev) => ({
        ...prev,
        submit: errorMessage,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      console.log("Edit mode activated with data:", {
        observation,
        dayData,
        groupData,
        groupDataLength: groupData?.length || 0
      });
    }
  }, [isEdit, observation, dayData, groupData]);

  // Loading state
  const isLoading =
    createMutation.isPending ||
    loadingInstruments ||
    isSubmitting ||
    updateObservationMutation.isPending ||
    updateDayDataMutation.isPending ||
    createGroupDataMutation.isPending ||
    updateGroupDataMutation.isPending ||
    deleteGroupDataMutation.isPending;

  if (loadingInstruments) {
    return <LoadingIndicator />;
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="p-4 mb-4 border-l-4 border-red-500 rounded-md bg-red-500/10">
          <p className="text-red-400">
            {typeof errors.submit === "string"
              ? errors.submit
              : "An error occurred during submission"}
          </p>
        </div>
      )}

      {/* Image Upload Section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-lg font-semibold text-amber-400">
            SDO Image
          </h3>

          <div className="mb-4">
            <label className="form-label">Upload Image</label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                id="sdo_image"
                accept="image/*"
                className="hidden"
                onChange={handleSdoImageChange}
              />
              <label
                htmlFor="sdo_image"
                className="flex items-center px-4 py-2 rounded-md cursor-pointer bg-slate-700 text-slate-100 hover:bg-slate-600"
              >
                <Upload size={16} className="mr-2" />
                Choose File
              </label>
              <span className="text-sm text-slate-400">
                {sdoImage ? sdoImage.name : "No file chosen"}
              </span>
            </div>
            {errors.sdoImage && <p className="error-msg">{errors.sdoImage}</p>}
          </div>

          {/* Image Preview */}
          <div className="relative w-full overflow-hidden rounded-lg aspect-video bg-slate-700">
            {sdoImagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sdoImagePreview}
                alt="SDO Image Preview"
                className="object-contain w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No image selected
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-lg font-semibold text-amber-400">
            Daily Protocol (PDF)
          </h3>

          <div className="mb-4">
            <label className="form-label">Upload PDF</label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                id="daily_protocol"
                accept="application/pdf"
                className="hidden"
                onChange={handleDailyProtocolChange}
              />
              <label
                htmlFor="daily_protocol"
                className="flex items-center px-4 py-2 rounded-md cursor-pointer bg-slate-700 text-slate-100 hover:bg-slate-600"
              >
                <Upload size={16} className="mr-2" />
                Choose PDF
              </label>
              <span className="text-sm text-slate-400">
                {dailyProtocol ? dailyProtocol.name : "No file chosen"}
              </span>
            </div>
            {errors.dailyProtocol && (
              <p className="error-msg">{errors.dailyProtocol}</p>
            )}
          </div>

          {/* PDF Preview */}
          <div className="relative w-full overflow-hidden rounded-lg aspect-video bg-slate-700">
            {dailyProtocolPreview ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-amber-400">PDF Document Selected</p>
                <a
                  href={dailyProtocolPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-4 py-2 mt-4 rounded-md bg-slate-600 hover:bg-slate-500"
                >
                  <FileText size={16} className="mr-2" />
                  Preview PDF
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No PDF selected
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Basic Observation Information */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-amber-400">
          Observation Details
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="created"
            name="created"
            label="Observation Date"
            type="date"
            value={formData.created}
            onChange={handleChange}
            error={errors.created}
          />

          <div>
            <label className="form-label" htmlFor="instrument_id">
              Instrument
            </label>

            {instruments?.length === 0 ? (
              <div className="p-4 border-l-4 border-yellow-500 rounded-md bg-yellow-900/20">
                <p className="text-sm text-yellow-400">
                  You do not have any instruments yet. Please create an
                  instrument first.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push("/instruments/new")}
                >
                  Create Instrument
                </Button>
              </div>
            ) : (
              <>
                <select
                  id="instrument_id"
                  name="instrument_id"
                  className="form-input"
                  value={formData.instrument_id}
                  onChange={handleChange}
                >
                  <option value="">Select an instrument</option>
                  {instruments?.map((instrument) => (
                    <option key={instrument.id} value={instrument.id}>
                      {instrument.i_type || `Instrument #${instrument.id}`}
                    </option>
                  ))}
                </select>
                {errors.instrument_id && (
                  <p className="error-msg">{errors.instrument_id}</p>
                )}
              </>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="form-label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              className="form-input min-h-[100px]"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes about this observation..."
            />
          </div>

          <div>
            <label className="form-label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              className="form-input"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
            </select>
          </div>

          <div className="flex items-center py-2">
            <input
              id="is_public"
              name="is_public"
              type="checkbox"
              className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
              checked={formData.is_public}
              onChange={handleChange}
            />
            <label className="mb-0 ml-2 form-label" htmlFor="is_public">
              Make this observation public
            </label>
          </div>

          {user?.is_labeler && (
            <div className="flex items-center py-2">
              <input
                id="verified"
                name="verified"
                type="checkbox"
                className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                checked={formData.verified}
                onChange={handleChange}
              />
              <label className="mb-0 ml-2 form-label" htmlFor="verified">
                Mark as verified
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Groups and Spots Summary */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-amber-400">
          Observation Summary
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            id="totalGroups"
            name="totalGroups"
            label="Number of Groups"
            type="number"
            min="0"
            value={
              isEdit && groupDataState.length > 0
                ? groupDataState.length
                : totalGroups
            }
            onChange={(e) => {
              const newValue = parseInt(e.target.value, 10) || 0;
              setTotalGroups(newValue);

              // Update group data array
              if (newValue > groupDataState.length) {
                // Add new groups
                const newGroups = [];
                for (let i = groupDataState.length; i < newValue; i++) {
                  newGroups.push({
                    g_code: 1, // Default code
                    g_date: getTodayDate(),
                    g_ut: null,
                    g_q: null,
                    g_nr: null,
                    g_f: null,
                    g_zpd: "",
                    g_p: null,
                    g_s: null,
                    g_sector: null,
                    g_a: null,
                    g_pos: "",
                    // IDs will be assigned by the server
                    day_data_id: isEdit ? dayData?.id : null,
                    observation_id: isEdit ? observation?.id : null,
                  });
                }
                setGroupDataState([...groupDataState, ...newGroups]);
              } else if (newValue < groupDataState.length) {
                // Handle group removal...
              }
            }}
            error={errors.totalGroups}
          />

          <FormField
            id="totalSpots"
            name="totalSpots"
            label="Number of Spots"
            type="number"
            min="0"
            value={totalSpots}
            onChange={(e) => setTotalSpots(parseInt(e.target.value, 10) || 0)}
            error={errors.totalSpots}
          />
        </div>

        <div className="flex justify-end mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addGroupData}
          >
            <Plus size={16} className="mr-2" />
            Add Group
          </Button>
        </div>
      </Card>

      {/* Group Data Entries */}
      {groupDataState.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-amber-400">Sunspot Groups</h3>

          {groupDataState.map((group, index) => (
            <Card key={group.id || index}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-amber-400">
                  Group #{index + 1} {group.id ? `(ID: ${group.id})` : "(New)"}
                </h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGroupData(index)}
                >
                  <Trash2 size={16} className="text-red-400" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                <FormField
                  id={`group_${index}_code`}
                  name="g_code"
                  label="Code"
                  type="number"
                  value={group.g_code || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_code", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_date`}
                  name="g_date"
                  label="Date"
                  type="date"
                  value={group.g_date || getTodayDate()}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_date", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_ut`}
                  name="g_ut"
                  label="UT"
                  type="number"
                  value={group.g_ut || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_ut", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_q`}
                  name="g_q"
                  label="Quality"
                  type="number"
                  value={group.g_q || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_q", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_nr`}
                  name="g_nr"
                  label="Number"
                  type="number"
                  value={group.g_nr || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_nr", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_f`}
                  name="g_f"
                  label="F"
                  type="number"
                  value={group.g_f || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_f", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_zpd`}
                  name="g_zpd"
                  label="ZPD"
                  maxLength="3"
                  value={group.g_zpd || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_zpd", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_p`}
                  name="g_p"
                  label="P"
                  type="number"
                  value={group.g_p || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_p", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_s`}
                  name="g_s"
                  label="S"
                  type="number"
                  value={group.g_s || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_s", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_sector`}
                  name="g_sector"
                  label="Sector"
                  type="number"
                  value={group.g_sector || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_sector", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_a`}
                  name="g_a"
                  label="A"
                  type="number"
                  value={group.g_a || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_a", e.target.value)
                  }
                />

                <FormField
                  id={`group_${index}_pos`}
                  name="g_pos"
                  label="Position"
                  maxLength="6"
                  value={group.g_pos || ""}
                  onChange={(e) =>
                    handleGroupDataChange(index, "g_pos", e.target.value)
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Day Data (Calculated) */}
      <Card>
        <div className="pb-4 mb-4 border-b border-slate-700">
          <h3 className="text-xl font-bold text-amber-400">
            Day Data (Auto-Calculated)
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            This data is automatically calculated based on the group data you
            provide.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="mb-1 text-xs text-slate-400">Code</p>
            <p>{dayDataState.d_code}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">Date</p>
            <p>{formatDate(dayDataState.d_date)}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">UT</p>
            <p>{dayDataState.d_ut}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">Quality</p>
            <p>{dayDataState.d_q}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">Groups</p>
            <p>{totalGroups}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">Spots</p>
            <p>{totalSpots}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">A</p>
            <p>{dayDataState.d_a}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">B</p>
            <p>{dayDataState.d_b}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">C</p>
            <p>{dayDataState.d_c}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">D</p>
            <p>{dayDataState.d_d}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">E</p>
            <p>{dayDataState.d_e}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">F</p>
            <p>{dayDataState.d_f}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">G</p>
            <p>{dayDataState.d_g}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">H</p>
            <p>{dayDataState.d_h}</p>
          </div>

          <div>
            <p className="mb-1 text-xs text-slate-400">J</p>
            <p>{dayDataState.d_j}</p>
          </div>
        </div>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/observations")}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <div className="flex items-center">
              <Loader size={16} className="mr-2 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </div>
          ) : isEdit ? (
            "Update Observation"
          ) : (
            "Create Observation"
          )}
        </Button>
      </div>
    </form>
  );
}
