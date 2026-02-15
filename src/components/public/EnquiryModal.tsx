"use client";

import React, { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitTracking?: () => void;
  project?: {
    id?: string;
    name?: string;
  };
};

export default function EnquiryModal({
  open,
  onClose,
  onSubmitTracking,
  project,
}: Props) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    description: "",
    interest: "",
  });

  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const reset = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      description: "",
      interest: "",
    });
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    onSubmitTracking?.();

    console.log("Form submitted:", {
      ...formData,
      projectId: project?.id,
      projectName: project?.name,
    });

    setSubmitted(true);

    setTimeout(reset, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={reset}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* modal */}
      <div
        className="relative z-10 w-full max-w-md md:max-w-3xl lg:max-w-4xl
                   bg-white rounded-2xl border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {!submitted ? (
          <div className="max-h-[90vh] overflow-y-auto grid md:grid-cols-2">
            {/* LEFT */}
            <div className="hidden md:block pl-12 pr-6 py-12">
              <span className="text-xs font-semibold text-[#3E5F16] uppercase block mb-4">
                Contact
              </span>

              <h2 className="text-3xl font-bold mb-3">Get in touch</h2>

              <p className="text-sm text-gray-600">
                Use our contact form for all information requests.
                <br />
                All information is confidential.
              </p>

              <div className="mt-6 space-y-1 text-sm">
                <p className="text-[#3E5F16] font-medium">
                  info@homeintown.com
                </p>
                <p className="text-[#3E5F16] font-medium">
                  +91 98765 43210
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="px-10 pt-16 pb-12 bg-[#F7FAF9] relative">
              <button
                onClick={reset}
                className="absolute top-4 right-4 text-gray-500"
              >
                ✕
              </button>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    placeholder="First name *"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        firstName: e.target.value,
                      })
                    }
                    className="border rounded-md px-2 py-1.5 text-xs"
                  />

                  <input
                    required
                    placeholder="Last name *"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lastName: e.target.value,
                      })
                    }
                    className="border rounded-md px-2 py-1.5 text-xs"
                  />
                </div>

                <input
                  required
                  type="email"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      email: e.target.value,
                    })
                  }
                  className="border rounded-md px-2 py-1.5 text-xs w-full"
                />

                <input
                  required
                  type="tel"
                  placeholder="Phone *"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="border rounded-md px-2 py-1.5 text-xs w-full"
                />

                <textarea
                  required
                  rows={3}
                  placeholder="Message *"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  className="border rounded-md px-2 py-1.5 text-xs w-full"
                />

                <select
                  required
                  value={formData.interest}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interest: e.target.value,
                    })
                  }
                  className="border rounded-md px-2 py-1.5 text-xs w-full"
                >
                  <option value="">Interest *</option>
                  <option>Buying Flat</option>
                  <option>Buying Plot</option>
                  <option>Site Visit</option>
                </select>

                <button
                  type="submit"
                  className="w-full bg-[#3E5F16] text-white py-2 rounded-md text-xs"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <h4 className="text-xl font-bold mb-2">Thank You!</h4>
            <p>Your enquiry has been submitted.</p>
          </div>
        )}
      </div>
    </div>
  );
}
