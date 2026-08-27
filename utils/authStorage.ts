/**
 * Auth state is cached per PE_USERNAME so switching users does not reuse the
 * previous session. Paths stay posix-style for consistent resolution on Windows.
 */
export function getAuthStoragePath(): string {
  const user = process.env.PE_USERNAME?.trim() || 'default';
  return `playwright/.auth/${user.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`;
}

/** Records which username last wrote the storage file, so global setup can refresh it. */
export function getAuthMetaPath(): string {
  return 'playwright/.auth/.current-user';
}
