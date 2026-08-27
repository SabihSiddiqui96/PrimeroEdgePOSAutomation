import { getEnvVar } from './env';

const DEFAULT_BASE_URL = 'https://qa.primeroedge.co';

/** Origin used for relative navigations. Override with BASE_URL per environment. */
export function getBaseUrl(): string {
  return getEnvVar('BASE_URL', { required: false }) || DEFAULT_BASE_URL;
}

export function getLoginPath(): string {
  return getEnvVar('LOGIN_PATH', { required: false }) || '/login.aspx';
}

export function getDashboardPath(): string {
  return getEnvVar('DASHBOARD_PATH', { required: false }) || '/dashboard.aspx';
}

export function getPosHomePath(): string {
  return getEnvVar('POS_HOME_PATH', { required: false }) || '/POS/POSHome.aspx';
}

export function getDistrictName(): string {
  return getEnvVar('DISTRICT_NAME', { required: false }) || 'MERCER COUNTY SCHOOLS';
}
