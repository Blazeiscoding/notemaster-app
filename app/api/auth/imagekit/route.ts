import ImageKit from "imagekit";
import { errorResponse, successResponse, withAuth } from "@/lib/api-middleware";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

export const GET = withAuth(
  async ({ rateLimitHeaders, requestId, logger }) => {
    if (
      !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
      !process.env.IMAGEKIT_PRIVATE_KEY ||
      !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
    ) {
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
