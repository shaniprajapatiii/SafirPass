import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary from environment variables if present
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a document or biometric image to Cloudinary (or fallback gracefully to dataUrl)
 * @param {string} fileDataUrl - Base64 Data URL
 * @param {string} folder - Destination folder (e.g. "safirpass/documents" or "safirpass/biometrics")
 * @param {string} publicId - Custom identifier for the file
 * @returns {Promise<{ url: string, secureUrl: string, publicId: string, bytes?: number }>}
 */
export async function uploadToCloudinary(fileDataUrl, folder = "safirpass/documents", publicId = null) {
  if (!fileDataUrl || typeof fileDataUrl !== "string") {
    return null;
  }

  const hasCloudinaryCredentials = Boolean(
    (process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  if (!hasCloudinaryCredentials) {
    // Graceful fallback when Cloudinary API credentials aren't set: preserve dataUrl directly
    return {
      url: fileDataUrl,
      secureUrl: fileDataUrl,
      publicId: publicId || `doc_${Date.now()}`,
      storageType: "base64_mongodb",
    };
  }

  try {
    const uploadOptions = {
      folder,
      resource_type: "auto",
      ...(publicId ? { public_id: publicId, overwrite: true } : {}),
    };

    const uploadRes = await cloudinary.uploader.upload(fileDataUrl, uploadOptions);

    return {
      url: uploadRes.url,
      secureUrl: uploadRes.secure_url,
      publicId: uploadRes.public_id,
      bytes: uploadRes.bytes,
      format: uploadRes.format,
      storageType: "cloudinary",
    };
  } catch (err) {
    console.warn("Cloudinary upload warning (falling back to Mongo base64):", err.message);
    return {
      url: fileDataUrl,
      secureUrl: fileDataUrl,
      publicId: publicId || `doc_${Date.now()}`,
      storageType: "base64_mongodb",
    };
  }
}

export default cloudinary;
