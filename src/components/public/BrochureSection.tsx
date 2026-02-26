"use client";

import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

type BrochureSectionProps = {
  pdfUrl: string;
};

export default function BrochureSection({ pdfUrl }: BrochureSectionProps) {
  const [numPages, setNumPages] = useState(0);
  const [openViewer, setOpenViewer] = useState(false);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }, []);

  return (
    <div className="bg-gray-100 p-6 rounded-xl">
      <h2 className="text-xl font-semibold mb-4">Project Brochure</h2>

      <div className="grid grid-cols-3 gap-3 relative">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {[...Array(Math.min(6, numPages))].map((_, i) => (
            <Page key={i} pageNumber={i + 1} width={200} />
          ))}
        </Document>

        <div
          onClick={() => setOpenViewer(true)}
          className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center cursor-pointer"
        >
          <button className="text-lg font-semibold">
            View Brochure
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <a
          href={pdfUrl}
          download
          className="border border-purple-500 text-purple-600 px-6 py-2 rounded-lg"
        >
          ⬇ Download Brochure
        </a>
      </div>

      {openViewer && (
        <div className="fixed inset-0 bg-black z-50 overflow-y-auto">
          <button
            onClick={() => setOpenViewer(false)}
            className="absolute top-4 right-6 text-white text-2xl"
          >
            ✕
          </button>

          <div className="p-6 space-y-6">
            <Document file={pdfUrl}>
              {[...Array(numPages)].map((_, i) => (
                <Page key={i} pageNumber={i + 1} width={800} />
              ))}
            </Document>
          </div>
        </div>
      )}
    </div>
  );
}