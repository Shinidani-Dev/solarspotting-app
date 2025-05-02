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