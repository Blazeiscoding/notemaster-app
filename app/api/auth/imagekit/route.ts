import ImageKit from "imagekit";
import { errorResponse, successResponse, withAuth } from "@/lib/api-middleware";

let client: ImageKit | null = null;

/**
 * Build the ImageKit client on first use, or return null when uploads are not
 * configured.
 *
 * This used to be constructed at module scope with non-null assertions on the
 * env vars. ImageKit throws from its constructor when they are missing, and
 * module scope runs while Next collects page data — so a deployment without
 * ImageKit credentials failed the whole build, and the "not configured" branch
 * below could never be reached to return its 503.
 */
function getImageKit(): ImageKit | null {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    return null;
  }

  client ??= new ImageKit({ publicKey, privateKey, urlEndpoint });
  return client;
}

export const GET = withAuth(
  async ({ rateLimitHeaders, requestId, logger }) => {
    const imagekit = getImageKit();

    if (!imagekit) {
      return errorResponse(
        "Image uploads are not configured",
        503,
        rateLimitHeaders,
        requestId
      );
    }

    try {
      const authenticationParameters = imagekit.getAuthenticationParameters();
      return successResponse(
        authenticationParameters,
        200,
        rateLimitHeaders,
        requestId
      );
    } catch (error) {
      logger.error("ImageKit auth error", error);
      return errorResponse(
        "Failed to generate authentication parameters",
        500,
        rateLimitHeaders,
        requestId
      );
    }
  },
  { rateLimitSuffix: "imagekit-auth" }
);
