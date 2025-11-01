declare module "next-pwa" {
  import type { NextConfig } from "next";

  type NextPWAOptions = {
    dest?: string;
    disable?: boolean;
    [key: string]: unknown;
  };

  export default function withPWA(options?: NextPWAOptions): (config: NextConfig) => NextConfig;
}
