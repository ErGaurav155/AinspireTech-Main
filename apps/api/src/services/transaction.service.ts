export const uploadTextToCloudinary = async (
  text: string,
  fileName: string,
): Promise<string> => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
      throw new Error("CLOUDINARY_CLOUD_NAME is missing");
    }

    console.log("Starting Cloudinary upload for:", fileName);

    // For unsigned uploads, we only need cloud name and upload preset
    const formData = new FormData();

    // Create a blob from the text
    const blob = new Blob([text], { type: "text/plain" });
    formData.append("file", blob);
    formData.append("upload_preset", "scraped_data"); // Your preset name
    formData.append("public_id", fileName);

    // For unsigned uploads, we don't need API key/secret in the request
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const errorResult = await response.json();
      console.error("Cloudinary API error:", errorResult);
      throw new Error(
        errorResult.error?.message ||
          `Upload failed with status: ${response.status}`,
      );
    }

    const result = await response.json();
    console.log("Cloudinary upload successful:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(
      `Failed to upload file to Cloudinary: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};
