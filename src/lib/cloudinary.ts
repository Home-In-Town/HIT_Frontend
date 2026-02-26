export async function uploadToCloudinary(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append(
    'upload_preset',
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!
  );

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error('Upload failed');
  }

  const data = await res.json();
  return data.secure_url as string;
}
export async function uploadPdfToCloudinary(file: File) {
  const formData = new FormData();

  formData.append("file", file);

  // 👉 Use a separate preset for PDFs (recommended)
  formData.append(
    "upload_preset",
    process.env.NEXT_PUBLIC_CLOUDINARY_PDF_PRESET!
  );

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    const error = await res.json();
    console.error("Cloudinary PDF Upload Error:", error);
    throw new Error("PDF upload failed");
  }

  const data = await res.json();

  return {
    url: data.secure_url as string,
    publicId: data.public_id as string,
    originalName: data.original_filename as string,
  };
}