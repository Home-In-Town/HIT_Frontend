'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, ProjectFormData, AMENITIES, ProjectType, ProjectStatus } from '@/types/project';
import { projectsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRef } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';


interface ProjectFormProps {
  initialData?: Partial<Project>;
  mode: 'create' | 'edit';
}



const validateFileSize = (file: File, maxKB: number) => {
  return file.size <= maxKB * 1024;
};


const DEFAULT_FORM_DATA: ProjectFormData = {
  name: '',
  type: 'flat',
  builderName: '',
  city: '',
  location: '',
  latitude: 0,
  longitude: 0,
  googleMapLink: '',
  reraApproved: false,
  reraNumber: '',
  projectStatus: 'under-construction',
  startingPrice: 0,
  pricePerSqFt: 0,
  priceRange: '',
  paymentPlan: '',
  bankLoanAvailable: false,
  bhkOptions: [],
  carpetAreaRange: '',
  floorRange: '',
  plotSizeRange: '',
  facingOptions: [],
  gatedCommunity: false,
  amenities: [],
  coverImage: '',
  galleryImages: [],
  videos: [],
  brochureUrl: '',
  ctaButtonText: 'Book Site Visit',
  whatsappNumber: '',
  callNumber: '',
  isPublished: false,
};

const InputField = ({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  value,
  onChange,
  error,
  inputProps = {},
  refCallback,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  refCallback?: (el: HTMLInputElement | null) => void;
}) => (
  <div>
    <label className="block text-sm font-medium text-[#57534E] mb-1.5 font-sans">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <input
    ref={refCallback}
      type={type}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={`w-full px-4 py-2.5 bg-white rounded-lg text-[#2A2A2A] placeholder-[#A8A29E] transition-shadow
        focus:outline-none focus:ring-2 focus:border-transparent
        ${
          error
            ? 'border border-red-500 ring-1 ring-red-500 focus:ring-red-500'
            : 'border border-[#D6D3D1] focus:ring-[#B45309]'
        }
      `}
      {...inputProps}
    />

    {error && (
      <p className="mt-1 text-sm text-red-600">
        {error}
      </p>
    )}
  </div>
);


export default function ProjectForm({ initialData, mode }: ProjectFormProps) {
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const COVER_IMAGE_MAX_KB = 500;    // 500 KB
  const GALLERY_IMAGE_MAX_KB = 500;  // 500 KB each
  const BROCHURE_MAX_KB = 2048;      // 2 MB
  const VIDEO_MAX_KB = 30 * 1024; // 5 MB per video (MAX)
  const MAX_VIDEOS = 2;
  const [uploading, setUploading] = useState(false);

  const router = useRouter();
  const [formData, setFormData] = useState<ProjectFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedLink, setPublishedLink] = useState<string | null>(
    initialData?.trackableLink || null
  );

  const updateField = <K extends keyof ProjectFormData>(
    field: K,
    value: ProjectFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (isPublishing = false) => {
  const errors: Record<string, string> = {};

  // Section 1
  if (!formData.name?.trim()) errors.name = 'Project name is required';
  if (!formData.type) errors.type = 'Project type is required';
  if (!formData.builderName?.trim()) errors.builderName = 'Builder name is required';
  if (!formData.city?.trim()) errors.city = 'City is required';
  if (!formData.location?.trim()) errors.location = 'Location is required';
  if (!formData.googleMapLink?.trim()) errors.googleMapLink = 'Google Map Link is required';
  
  // Section 2
  if (formData.reraApproved && !formData.reraNumber?.trim()) {
    errors.reraNumber = 'RERA number is required when approved';
  }
  if (!formData.projectStatus) {
    errors.projectStatus = 'Project status is required';
  }

  // Section 3
  if (!formData.startingPrice) errors.startingPrice = 'Starting price is required';

  // Section 4
  if (formData.type === 'flat' && (!formData.bhkOptions || formData.bhkOptions.length === 0)) {
    errors.bhkOptions = 'Select at least one BHK option';
  }

  // Section 5
  if (!formData.amenities || formData.amenities.length === 0) {
    errors.amenities = 'Select at least one amenity';
  }

  // Section 6
  if (!formData.coverImage?.trim()) { errors.coverImage = 'Cover image is required'; }


  // Section 7
  if (!formData.ctaButtonText?.trim()) {
    errors.ctaButtonText = 'CTA button text is required';
  }

  if (!formData.whatsappNumber || formData.whatsappNumber.length < 10) {
    errors.whatsappNumber = 'Enter a valid WhatsApp number';
  }

  if (!formData.callNumber || formData.callNumber.length < 10) {
    errors.callNumber = 'Enter a valid call number';
  }

  setFormErrors(errors);
  const firstErrorKey = Object.keys(errors)[0];
  if (firstErrorKey) {
    const el = fieldRefs.current[firstErrorKey];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  }
  return Object.keys(errors).length === 0;
};

  const handleSubmit = async (e: React.FormEvent, publish = false) => {
  e.preventDefault();

  setError(null);

   const isValid = validateForm(publish);
  if (!isValid) {
    setError('Please fix the highlighted errors before continuing.');
    return;
  }
  // Generate slug from project name
  const slug = formData.name.toLowerCase().trim().replace(/\s+/g, '-');

  try {
    setLoading(true);
    // Check for duplicate slug
    const existingProject = await projectsApi.getBySlug(slug).catch(() => null);

    if (existingProject) {
      // If creating a new project OR editing a different project with same slug
      if (mode === 'create' || existingProject.id !== initialData?.id) {
        toast.error(
          `Project with name "${formData.name}" already exists. Please choose a different name.`
        );
        setLoading(false);
        return;
      }
    }

    let project: Project;

    if (mode === 'create') {
      project = await projectsApi.create(formData);
    } else {
      project = await projectsApi.update(initialData!.id!, formData);
    }

    if (publish) {
      const result = await projectsApi.publish(project.id);
      setPublishedLink(result.trackableLink);
      const fullLink = window.location.origin + result.trackableLink;
      try {
        await navigator.clipboard.writeText(fullLink);
        toast.success('Project Created & Link Copied!');
      } catch (err) {
        console.error('Failed to copy link:', err);
        toast.success('Project Created! (Copy link manually)');
      }
    }

    router.push('/dashboard/projects');
  } catch (err: any) {
    console.error('API error:', err);
    // Friendly fallback for duplicate key error
    if (err.message?.includes('duplicate key')) {
      toast.error(
        `Project with name "${formData.name}" already exists. Please choose another name.`
      );
    } else {
      toast.error('An unexpected error occurred. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};


  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleBHKToggle = (bhk: string) => {
    setFormData((prev) => ({
      ...prev,
      bhkOptions: prev.bhkOptions?.includes(bhk)
        ? prev.bhkOptions.filter((b) => b !== bhk)
        : [...(prev.bhkOptions || []), bhk],
    }));
  };

  const handleFacingToggle = (facing: string) => {
    setFormData((prev) => ({
      ...prev,
      facingOptions: prev.facingOptions?.includes(facing)
        ? prev.facingOptions.filter((f) => f !== facing)
        : [...(prev.facingOptions || []), facing],
    }));
  };

  const addGalleryImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      if (url.includes('unsplash.com/photos/')) {
        alert(
          'It looks like you pasted an Unsplash PAGE URL (a website), not an image file.\n\nPlease right-click the image on Unsplash and select "Copy Image Address" (or "Copy Image Link") to get the direct link.\n\nDirect links usually start with "https://images.unsplash.com/..."'
        );
        return;
      }
      setFormData((prev) => ({
        ...prev,
        galleryImages: [...prev.galleryImages, url],
      }));
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index),
    }));
  };

  

  const removeVideo = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-8 max-w-5xl mx-auto">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {publishedLink && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 font-medium mb-2">✅ Project Published!</p>
          <p className="text-sm text-green-600">Trackable Link:</p>
          <a
            href={publishedLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-800 font-medium hover:underline break-all"
          >
            {window.location.origin}{publishedLink}
          </a>
        </div>
      )}

      {/* Section 1: Basic Details */}
      <section className="bg-white p-6 sm:p-8 rounded-xl border border-[#E7E5E4] shadow-sm">
        <h2 className="text-xl font-bold text-[#2A2A2A] mb-6 flex items-center gap-3 font-serif">
          <span className="w-8 h-8 bg-[#B45309] text-white rounded-full flex items-center justify-center text-sm font-sans">1</span>
          Basic Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Project Name"
            name="name"
            placeholder="e.g., Sunrise Heights"
            required
            value={formData.name}
            error={formErrors.name}
            refCallback={(el) => (fieldRefs.current.name = el)}
            onChange={(v) => updateField('name', v)}
          />
          
          <div>
            <label className="block text-sm font-medium text-[#57534E] mb-1.5">
              Project Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {(['flat', 'plot'] as ProjectType[]).map((type) => (
                <label
                  key={type}
                  className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all text-center ${
                    formData.type === type
                      ? 'border-[#B45309] bg-orange-50 text-[#B45309] font-medium ring-1 ring-[#B45309]'
                      : 'border-[#D6D3D1] text-[#78716C] hover:border-[#A8A29E] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={(e) => updateField('type', e.target.value as ProjectType)}
                    className="sr-only"
                  />
                  {type === 'flat' ? '🏢 Apartment' : '🏡 Plot'}
                </label>
              ))}
            </div>
            {formErrors.type && (
              <p className="text-sm text-red-600 mt-1">
                {formErrors.type}
              </p>
            )}
          </div>

          <InputField
            label="Builder / Developer Name"
            name="builderName"
            placeholder="e.g., ABC Developers"
            required
            value={formData.builderName}
            error={formErrors.builderName}
            refCallback={(el) => (fieldRefs.current.builderName = el)}
            onChange={(v) => updateField('builderName', v)}
          />

          <InputField
            label="City"
            name="city"
            placeholder="e.g., Mumbai"
            required
            value={formData.city}
            error={formErrors.city}
            refCallback={(el) => (fieldRefs.current.name = el)}
            onChange={(v) => updateField('city', v)}
          />

          <InputField
            label="Location / Area"
            name="location"
            placeholder="e.g., Andheri West"
            required
            value={formData.location}
            error={formErrors.location}
            refCallback={(el) => (fieldRefs.current.location = el)}
            onChange={(v) => updateField('location', v)}
          />

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Latitude"
              name="latitude"
              type="number"
              placeholder="e.g., 19.0760"
              value={formData.latitude || ''}
              onChange={(v) => updateField('latitude', Number(v))}
            />

            <InputField
              label="Longitude"
              name="longitude"
              type="number"
              placeholder="e.g., 72.8777"
              value={formData.longitude || ''}
              onChange={(v) => updateField('longitude', Number(v))}
            />
          </div>

          <InputField
            label="Google Map Link"
            name="googleMapLink"
            type="url"
            placeholder="https://maps.google.com/..."
            required
            error={formErrors.googleMapLink}
            refCallback={(el) => (fieldRefs.current.googleMapLink = el)}
            value={formData.googleMapLink}
            onChange={(v) => updateField('googleMapLink', v)}
          />
        </div>
      </section>

      {/* Section 2: Legal & Trust */}
      <section className="bg-white p-6 sm:p-8 rounded-xl border border-[#E7E5E4] shadow-sm">
        <h2 className="text-xl font-bold text-[#2A2A2A] mb-6 flex items-center gap-3 font-serif">
          <span className="w-8 h-8 bg-[#3F6212] text-white rounded-full flex items-center justify-center text-sm font-sans">2</span>
          Legal & Trust
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[#57534E] mb-1.5">
              RERA Approved
            </label>
            <div className="flex gap-4">
              {[true, false].map((val) => (
                <label
                  key={String(val)}
                  className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all text-center ${
                    formData.reraApproved === val
                      ? 'border-green-600 bg-green-50 text-green-700 font-medium ring-1 ring-green-600'
                      : 'border-[#D6D3D1] text-[#78716C] hover:border-[#A8A29E] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="reraApproved"
                    checked={formData.reraApproved === val}
                    onChange={() => updateField('reraApproved', val)}
                    className="sr-only"
                  />
                  {val ? '✓ Yes' : '✗ No'}
                </label>
              ))}
            </div>
          </div>

          {formData.reraApproved && (
            <InputField
              label="RERA Number"
              name="reraNumber"
              placeholder="e.g., P52000012345"
              value={formData.reraNumber || ''}
              onChange={(v) => updateField('reraNumber', v)}
            />
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[#57534E] mb-2">
              Project Status
            </label>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  { value: 'pre-launch', label: '🚀 Pre-Launch' },
                  { value: 'under-construction', label: '🏗️ Under Construction' },
                  { value: 'ready-to-move', label: '✅ Ready to Move' },
                ] as { value: ProjectStatus; label: string }[]
              ).map(({ value, label }) => (
                <label
                  key={value}
                  className={`px-4 py-2 border rounded-lg cursor-pointer transition-all ${
                    formData.projectStatus === value
                      ? 'border-[#B45309] bg-orange-50 text-[#B45309] font-medium'
                      : 'border-[#D6D3D1] text-[#78716C] hover:border-[#A8A29E] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="projectStatus"
                    value={value}
                    checked={formData.projectStatus === value}
                    onChange={(e) => updateField('projectStatus', e.target.value as ProjectStatus)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Pricing Details */}
      <section className="bg-white p-6 sm:p-8 rounded-xl border border-[#E7E5E4] shadow-sm">
        <h2 className="text-xl font-bold text-[#2A2A2A] mb-6 flex items-center gap-3 font-serif">
          <span className="w-8 h-8 bg-[#B45309] text-white rounded-full flex items-center justify-center text-sm font-sans">3</span>
          Pricing & Payment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Starting Price (₹)"
            name="startingPrice"
            type="number"
            placeholder="e.g., 8500000"
            required
            value={formData.startingPrice || ''}
            error={formErrors.startingPrice}
            refCallback={(el) => (fieldRefs.current.startingPrice = el)}
            onChange={(v) => updateField('startingPrice', Number(v))}
          />

          <InputField
            label="Price Per Sq Ft (₹)"
            name="pricePerSqFt"
            type="number"
            placeholder="e.g., 15000"
            required
            value={formData.pricePerSqFt || ''}
            error={formErrors.pricePerSqFt}
            refCallback={(el) => (fieldRefs.current.pricePerSqFt = el)}
            onChange={(v) => updateField('pricePerSqFt', Number(v))}
          />

          <InputField
            label="Price Range"
            name="priceRange"
            placeholder="e.g., 85L - 1.5Cr"
            value={formData.priceRange}
            onChange={(v) => updateField('priceRange', v)}
          />

          <InputField
            label="Payment Plan"
            name="paymentPlan"
            placeholder="e.g., 10:80:10 or Flexible"
            value={formData.paymentPlan}
            onChange={(v) => updateField('paymentPlan', v)}
          />

          <div>
            <label className="block text-sm font-medium text-[#57534E] mb-1.5">
              Bank Loan Available
            </label>
            <div className="flex gap-4">
              {[true, false].map((val) => (
                <label
                  key={String(val)}
                  className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all text-center ${
                    formData.bankLoanAvailable === val
                      ? 'border-green-600 bg-green-50 text-green-700 font-medium'
                      : 'border-[#D6D3D1] text-[#78716C] hover:border-[#A8A29E] bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="bankLoanAvailable"
                    checked={formData.bankLoanAvailable === val}
                    onChange={() => updateField('bankLoanAvailable', val)}
                    className="sr-only"
                  />
                  {val ? '✓ Yes' : '✗ No'}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Property Configuration */}
      <section className="bg-white p-6 sm:p-8 rounded-xl border border-[#E7E5E4] shadow-sm">
        <h2 className="text-xl font-bold text-[#2A2A2A] mb-6 flex items-center gap-3 font-serif">
          <span className="w-8 h-8 bg-[#3F6212] text-white rounded-full flex items-center justify-center text-sm font-sans">4</span>
          Configuration
          <span className="ml-2 px-2 py-0.5 bg-[#F5F5F4] text-[#57534E] text-xs rounded border border-[#E7E5E4] font-sans font-normal uppercase tracking-wider">
            {formData.type === 'flat' ? 'Apartments' : 'Plots'}
          </span>
        </h2>

        {formData.type === 'flat' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[#57534E] mb-2">
                BHK Options
              </label>
              <div className="flex flex-wrap gap-2">
                {['1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'Penthouse'].map((bhk) => (
                  <button
                    key={bhk}
                    type="button"
                    onClick={() => handleBHKToggle(bhk)}
                    className={`px-4 py-2 border rounded-lg transition-all ${
                      formData.bhkOptions?.includes(bhk)
                        ? 'border-[#B45309] bg-orange-50 text-[#B45309] font-medium'
                        : 'border-[#D6D3D1] text-[#57534E] hover:border-[#A8A29E] bg-white'
                    }`}
                  >
                    {bhk}
                  </button>
                ))}
              </div>
                {formErrors.bhkOptions && (
                  <p className="text-sm text-red-600 mt-2">
                    {formErrors.bhkOptions}
                  </p>
                )}
            </div>

            <InputField
              label="Carpet Area Range"
              name="carpetAreaRange"
              placeholder="e.g., 650 - 1200 sqft"
              value={formData.carpetAreaRange || ''}
              onChange={(v) => updateField('carpetAreaRange', v)}
            />

            <InputField
              label="Floor Range"
              name="floorRange"
              placeholder="e.g., 1-25"
              value={formData.floorRange || ''}
              onChange={(v) => updateField('floorRange', v)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label="Plot Size Range"
              name="plotSizeRange"
              placeholder="e.g., 1000 - 2500 sqft"
              value={formData.plotSizeRange || ''}
              onChange={(v) => updateField('plotSizeRange', v)}
            />

            <div>
              <label className="block text-sm font-medium text-[#57534E] mb-2">
                Facing Options
              </label>
              <div className="flex flex-wrap gap-2">
                {['East', 'West', 'North', 'South', 'North-East', 'South-East'].map(
                  (facing) => (
                    <button
                      key={facing}
                      type="button"
                      onClick={() => handleFacingToggle(facing)}
                      className={`px-3 py-1.5 border rounded-lg text-sm transition-all ${
                        formData.facingOptions?.includes(facing)
                          ? 'border-[#B45309] bg-orange-50 text-[#B45309] font-medium'
                          : 'border-[#D6D3D1] text-[#57534E] hover:border-[#A8A29E] bg-white'
                      }`}
                    >
                      {facing}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#57534E] mb-1.5">
                Gated Community
              </label>
              <div className="flex gap-4">
                {[true, false].map((val) => (
                  <label
                    key={String(val)}
                    className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all text-center ${
                      formData.gatedCommunity === val
                        ? 'border-green-600 bg-green-50 text-green-700 font-medium'
                        : 'border-[#D6D3D1] text-[#78716C] hover:border-[#A8A29E] bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gatedCommunity"
                      checked={formData.gatedCommunity === val}
                      onChange={() => updateField('gatedCommunity', val)}
                      className="sr-only"
                    />
                    {val ? '✓ Yes' : '✗ No'}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 5: Amenities */}
      <section className="bg-white p-6 sm:p-8 rounded-xl border border-[#E7E5E4] shadow-sm">
        <h2 className="text-xl font-bold text-[#2A2A2A] mb-6 flex items-center gap-3 font-serif">
          <span className="w-8 h-8 bg-[#B45309] text-white rounded-full flex items-center justify-center text-sm font-sans">5</span>
          Amenities
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => handleAmenityToggle(amenity)}
              className={`p-3 border rounded-lg transition-all text-left text-sm ${
                formData.amenities.includes(amenity)
                  ? 'border-[#B45309] bg-orange-50 text-[#B45309] font-medium'
                  : 'border-[#D6D3D1] text-[#57534E] hover:border-[#A8A29E] bg-white'
              }`}
            >
              {formData.amenities.includes(amenity) ? '✓ ' : ''}{amenity}
            </button>
          ))}
        </div>
        {formErrors.amenities && (
          <p className="text-sm text-red-600 mt-2">
            {formErrors.amenities}
          </p>
        )}
      </section>

     {/* Section 6: Media */}
<section className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E7E5E4] shadow-sm">
  <h2 className="text-xl font-semibold text-[#1C1917] mb-8 flex items-center gap-3">
    <span className="w-8 h-8 bg-[#3F6212] text-white rounded-full flex items-center justify-center text-sm">
      6
    </span>
    Media & Brochure
  </h2>

  <div className="space-y-8">

    {/* Cover Image */}
    <div className="border rounded-xl p-5 bg-[#FAFAF9]">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-[#44403C]">
          Cover Image <span className="text-red-500">*</span>
        </label>
        <span className="text-xs text-[#78716C]">
          JPG / PNG · Max {COVER_IMAGE_MAX_KB}KB
        </span>
      </div>

      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-[#3F6212] transition">
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (!validateFileSize(file, COVER_IMAGE_MAX_KB)) {
              toast.error(`Cover image must be under ${COVER_IMAGE_MAX_KB}KB`);
              return;
            }

            try {
              setUploading(true);
              const url = await uploadToCloudinary(file);
              updateField('coverImage', url);
            } catch {
              toast.error('Cover image upload failed');
            } finally {
              setUploading(false);
            }
          }}
        />
        <span className="text-sm text-[#57534E]">
          Click to upload cover image
        </span>
      </label>

      {formData.coverImage && (
        <div className="mt-4 w-56 h-36 rounded-lg overflow-hidden border">
          <img
            src={formData.coverImage}
            alt="Cover Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>

    {/* Gallery Images */}
    <div className="border rounded-xl p-5 bg-[#FAFAF9]">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium text-[#44403C]">
          Gallery Images
        </label>
        <span className="text-xs text-[#78716C]">
          JPG / PNG · Max {GALLERY_IMAGE_MAX_KB}KB each
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
        {formData.galleryImages.map((img, index) => (
          <div key={index} className="relative group">
            <img
              src={img}
              className="w-full h-24 object-cover rounded-lg border"
            />
            <button
              type="button"
              onClick={() => removeGalleryImage(index)}
              className="absolute top-1 right-1 bg-black/70 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer bg-white hover:bg-[#F5F5F4] text-sm">
        + Add Images
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files) return;

            try {
              setUploading(true);

              const newImages: string[] = [];

              for (const file of Array.from(files)) {
                if (!validateFileSize(file, GALLERY_IMAGE_MAX_KB)) {
                  toast.error(`${file.name} exceeds ${GALLERY_IMAGE_MAX_KB}KB`);
                  continue;
                }

                const url = await uploadToCloudinary(file);
                newImages.push(url);
              }

              if (newImages.length) {
                updateField('galleryImages', [
                  ...formData.galleryImages,
                  ...newImages,
                ]);
              }
            } catch {
              toast.error('Gallery image upload failed');
            } finally {
              setUploading(false);
              e.target.value = '';
            }
          }}
        />
      </label>
    </div>

    {/* Videos */}
    <div className="border rounded-xl p-5 bg-[#FAFAF9]">
      <div className="flex items-center justify-between mb-4">
        <label className="text-sm font-medium text-[#44403C]">
          Project Videos
        </label>
        <span className="text-xs text-[#78716C]">
          MP4 / WebM · Max {VIDEO_MAX_KB / 1024}MB · {MAX_VIDEOS} videos
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {formData.videos.map((video, index) => (
          <div key={index} className="relative border rounded-lg overflow-hidden">
            <video
              src={video}
              controls
              className="w-full h-44 object-cover bg-black"
            />
            <button
              type="button"
              onClick={() => removeVideo(index)}
              className="absolute top-2 right-2 bg-black/70 text-white w-7 h-7 rounded-full"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {formData.videos.length < MAX_VIDEOS && (
        <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer bg-white hover:bg-[#F5F5F4] text-sm">
          + Upload Videos
          <input
            type="file"
            accept="video/mp4,video/webm"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files;
              if (!files) return;

              const slots = MAX_VIDEOS - formData.videos.length;
              const selected = Array.from(files).slice(0, slots);

              try {
                setUploading(true);

                const newVideos: string[] = [];

                for (const file of selected) {
                  if (!validateFileSize(file, VIDEO_MAX_KB)) {
                    toast.error(`${file.name} exceeds size limit`);
                    continue;
                  }

                  const url = await uploadToCloudinary(file);
                  newVideos.push(url);
                }

                if (newVideos.length) {
                  updateField('videos', [...formData.videos, ...newVideos]);
                }
              } catch {
                toast.error('Video upload failed');
              } finally {
                setUploading(false);
                e.target.value = '';
              }
            }}
          />
        </label>
      )}
    </div>

    {/* Brochure */}
    <div className="border rounded-xl p-5 bg-[#FAFAF9]">
      <label className="text-sm font-medium text-[#44403C] mb-2 block">
        Brochure (PDF)
      </label>

      <label className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer bg-white hover:bg-[#F5F5F4] text-sm">
        Upload PDF
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (!validateFileSize(file, BROCHURE_MAX_KB)) {
              toast.error(`Brochure must be under ${BROCHURE_MAX_KB}KB`);
              return;
            }

            try {
              setUploading(true);
              const url = await uploadToCloudinary(file);
              updateField('brochureUrl', url);
            } catch {
              toast.error('Brochure upload failed');
            } finally {
              setUploading(false);
              e.target.value = '';
            }
          }}
        />
      </label>

      {formData.brochureUrl && (
        <p className="mt-2 text-sm text-green-700">
          ✔ Brochure uploaded successfully
        </p>
      )}
    </div>

  </div>
</section>


      {/* Section 7: Sales CTA */}
      <section className="bg-white p-6 sm:p-8 rounded-xl border border-[#E7E5E4] shadow-sm">
        <h2 className="text-xl font-bold text-[#2A2A2A] mb-6 flex items-center gap-3 font-serif">
          <span className="w-8 h-8 bg-[#B45309] text-white rounded-full flex items-center justify-center text-sm font-sans">7</span>
          Contact Configuration
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <InputField
            label="CTA Button Text"
            name="ctaButtonText"
            placeholder="e.g., Book Site Visit"
            required
            value={formData.ctaButtonText}
            error={formErrors.ctaButtonText}
            refCallback={(el) => (fieldRefs.current.ctaButtonText = el)}
            onChange={(v) => updateField('ctaButtonText', v)}
          />

          <InputField
            label="WhatsApp Number"
            name="whatsappNumber"
            placeholder="e.g., 919876543210"
            required
            value={formData.whatsappNumber}
            error={formErrors.whatsappNumber}
            refCallback={(el) => (fieldRefs.current.whatsappNumber = el)}
            onChange={(v) => updateField('whatsappNumber', v.replace(/\D/g, ''))}
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]{10,15}',
              minLength: 10,
              maxLength: 15,
              title: 'Enter a valid phone number (10–15 digits)',
            }}
          />

          <InputField
            label="Call Number"
            name="callNumber"
            placeholder="e.g., 919876543210"
            required
            value={formData.callNumber}
            error={formErrors.callNumber}
            refCallback={(el) => (fieldRefs.current.callNumber = el)}
            onChange={(v) => updateField('callNumber', v.replace(/\D/g, ''))}
            inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]{10,15}',
            minLength: 10,
            maxLength: 15,
            title: 'Enter a valid phone number (10–15 digits)',
          }}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="sticky bottom-0 bg-[#FAF7F2]/80 backdrop-blur-md border-t border-[#E7E5E4] p-4 -mx-4 sm:mx-0 flex flex-col-reverse sm:flex-row gap-4 sm:justify-end z-30">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="w-full sm:w-auto px-6 py-3 bg-white border border-[#D6D3D1] text-[#57534E] font-medium rounded-lg hover:bg-[#F5F5F4] transition-colors shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full sm:w-auto px-6 py-3 bg-[#57534E] text-white font-medium rounded-lg hover:bg-[#2A2A2A] transition-colors disabled:opacity-50 shadow-sm"
        >
           {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={loading || uploading}
          className="w-full sm:w-auto px-6 py-3 bg-[#B45309] text-white font-medium rounded-lg hover:bg-[#92400E] transition-colors disabled:opacity-50 shadow-md"
        >
           {uploading ? 'Uploading...' : loading ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </form>
  );
}
