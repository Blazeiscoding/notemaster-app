import { NextRequest, NextResponse } from "next/server";

/**
 * POST handler for PWA share target
 * Receives shared content from other apps and redirects to the share page
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const title = formData.get("title") as string | null;
    const text = formData.get("text") as string | null;
    const url = formData.get("url") as string | null;
    
    // Build query params for the share page
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (text) params.set("text", text);
    if (url) params.set("url", url);
    
    // Handle file uploads if present
    const files = formData.getAll("media") as File[];
    if (files.length > 0) {
      // For now, we'll just note that files were shared
      // Full file handling would require uploading to ImageKit
      params.set("hasFiles", "true");
      params.set("fileCount", files.length.toString());
    }
    
    // Redirect to the share page with the shared content
    const redirectUrl = new URL("/share", request.url);
    redirectUrl.search = params.toString();
    
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Share target error:", error);
    // On error, redirect to home page
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }
}

/**
 * GET handler - redirect to share page (for bookmarked share URLs)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = new URL("/share", request.url);
  redirectUrl.search = searchParams.toString();
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
