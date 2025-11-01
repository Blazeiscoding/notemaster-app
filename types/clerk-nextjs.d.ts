declare module "@clerk/nextjs" {
  export const ClerkProvider: any;
  export const SignedIn: any;
  export const SignedOut: any;
  export const SignInButton: any;
  export const UserButton: any;
  export const SignIn: any;
  export const SignUp: any;
  export function useUser(): { isSignedIn: boolean; user: { id?: string } | null };
}


