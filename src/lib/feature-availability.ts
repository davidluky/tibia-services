/**
 * Keep service-request applications unavailable until offers have a
 * transactional model and require explicit customer acceptance. Enabling this
 * also requires the product decision between first-match and multi-applicant
 * selection, plus the corresponding schema, API, and UI migration.
 */
export const SERVICE_REQUEST_APPLICATIONS_ENABLED = false

export const SERVICE_REQUEST_APPLICATIONS_UNAVAILABLE_ERROR =
  'service_request_applications_unavailable'
