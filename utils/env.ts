type EnvVarOptions = {
  required?: boolean;
};

/** Azure DevOps leaves `$(Name)` in place when a pipeline variable is undefined. */
export function isUnresolvedAzureVariable(value: string): boolean {
  return /^\$\([A-Za-z0-9_.-]+\)$/.test(value.trim());
}

export function getEnvVar(name: string, options: EnvVarOptions = {}): string | undefined {
  const value = process.env[name]?.trim();
  const required = options.required ?? true;
  const missing = value === undefined || value === '' || isUnresolvedAzureVariable(value);

  if (required && missing) {
    throw new Error(`${name} environment variable is not set`);
  }
  return missing ? undefined : value;
}

export function getRequiredEnvVar(name: string): string {
  return getEnvVar(name, { required: true })!;
}

export function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
