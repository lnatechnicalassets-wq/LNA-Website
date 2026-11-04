import { z } from "zod";

/**
 * Client-safe environment variables schema.
 * All variables MUST be prefixed with NEXT_PUBLIC_.
 * Safe to import and evaluate in both client and server contexts.
 * Contains ZERO server secrets or backend credentials.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("https://dummy.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("dummy_supabase_anon_key"),
  NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: z.string().default("1x00000000000000000000AA"),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

const parsedClient = clientEnvSchema.safeParse(process.env);
if (!parsedClient.success) {
  throw new Error(
    `Invalid client environment variables: ${JSON.stringify(parsedClient.error.format())}`
  );
}

export const clientEnv: ClientEnv = parsedClient.data;

/**
 * Accessor for validated client environment variables.
 * Safe to call from any client component, hook, or server component.
 */
export function getClientEnv(): ClientEnv {
  return clientEnv;
}
