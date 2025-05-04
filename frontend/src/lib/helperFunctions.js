/**
 * Formats a date string into localized Swiss German format
 * @param {string} dateString - ISO date string from API
 * @returns {string} - Formatted date string or 'N/A' if date is invalid
 */
export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  /**
   * Formats a date-time string into localized Swiss German format with time
   * @param {string} dateString - ISO date string from API
   * @returns {string} - Formatted date-time string or 'N/A' if date is invalid
   */
  export const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

/**
 * Formats a date string for HTML date input fields, handling timezone differences
 * @param {string} dateString - ISO date string from API
 * @returns {string} - Date formatted as YYYY-MM-DD for input fields
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return getTodayDate();
  
  // Create a date object that preserves the date value
  const date = new Date(dateString);
  
  // Add timezone offset to compensate for local timezone
  // This ensures you get the same date that was stored on the server
  const timezoneOffset = date.getTimezoneOffset() * 60000; // convert to milliseconds
  const adjustedDate = new Date(date.getTime() + timezoneOffset);
  
  // Return in YYYY-MM-DD format
  return adjustedDate.toISOString().split('T')[0];
};

/**
 * Gets today's date in YYYY-MM-DD format for input fields
 * @returns {string} - Today's date formatted as YYYY-MM-DD
 */
export const getTodayDate = () => {
  return new Date().toISOString().split("T")[0];
};