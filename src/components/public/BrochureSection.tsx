"use client";

type BrochureSectionProps = {
  pdfUrl: string;
};

export default function BrochureSection({ pdfUrl }: BrochureSectionProps) {
  if (!pdfUrl) return null;

  return (
  <div className="bg-gray-100 p-4 md:p-6 rounded-xl">
    <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">
      Project Brochure
    </h2>

    <div className="flex flex-row gap-3">
      
      {/* VIEW BUTTON */}
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="
          bg-[#3E5F16] text-white 
          px-4 py-2 md:px-6 md:py-2.5 
          rounded-lg 
          text-xs md:text-sm 
          font-medium 
          text-center
          hover:bg-[#2f4711] transition
        "
      >
        View Brochure
      </a>

      {/* DOWNLOAD BUTTON */}
      <button
        onClick={async () => {
          try {
            const res = await fetch(pdfUrl);
            const blob = await res.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const fileName = pdfUrl.split("/").pop() || "brochure.pdf";
            a.download = fileName;

            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
          } catch (err) {
            console.error("Download failed", err);
          }
        }}
        className="
          border border-[#3E5F16] text-[#3E5F16] 
          px-4 py-2 md:px-6 md:py-2.5 
          rounded-lg 
          text-xs md:text-sm 
          font-medium 
          text-center
          hover:bg-green-50 transition
        "
      >
        Download Brochure
      </button>

    </div>
  </div>
);
}