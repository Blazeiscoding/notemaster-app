declare module "minimatch" {
  // Minimal stub to satisfy the TypeScript compiler without installing @types/minimatch
  const minimatch: (path: string, pattern: string, options?: unknown) => boolean;
  export default minimatch;
  export function match(list: string[], pattern: string, options?: unknown): string[];
  export class Minimatch {
    constructor(pattern: string, options?: unknown);
    match(path: string): boolean;
  }
}


