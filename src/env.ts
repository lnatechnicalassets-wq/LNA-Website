import { clientEnv, getClientEnv, clientEnvSchema, type ClientEnv } from "./env.client";
import { serverEnv, getServerEnv, serverEnvSchema, type ServerEnv } from "./server/env";

export { clientEnv, getClientEnv, clientEnvSchema, type ClientEnv };
export { serverEnv, getServerEnv, serverEnvSchema, type ServerEnv };

/**
 * Unified proxy export:
 * Safely routes client variables from clientEnv anywhere,
 * and routes server variables through the compile-time guarded getServerEnv().
 */
export const env = new Proxy({} as ServerEnv & ClientEnv, {
  get(_target, prop: string) {
    if (prop.startsWith("NEXT_PUBLIC_")) {
      return getClientEnv()[prop as keyof ClientEnv];
    }
    return getServerEnv()[prop as keyof ServerEnv];
  },
});
