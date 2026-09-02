function requirePublicValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing public application configuration: ${name}`);
  }

  return value;
}

export function getSupabasePublicConfig() {
  return {
    url: requirePublicValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: requirePublicValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function getPublicAppUrl(): string {
  const value = requirePublicValue(
    "NEXT_PUBLIC_APP_URL",
    process.env.NEXT_PUBLIC_APP_URL,
  );
  try {
    return new URL(value).toString();
  } catch {
    throw new Error("Invalid public application configuration: NEXT_PUBLIC_APP_URL");
  }
}
