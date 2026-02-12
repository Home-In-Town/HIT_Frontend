

//sales-website-private-dev\frontend\src\app\visit\[slug]\page.tsx
'use client';

import { useParams, notFound } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ProjectMap from '@/components/public/ProjectMap';
import { Project } from '@/types/project';
import { projectsApi } from '@/lib/api'; // adjust path if needed
import { useTracking } from '@/hooks/useTracking';
import { MapPin, Map, Eye } from 'lucide-react';
import {
  Dumbbell,
  Waves,
  Trees,
  ShieldCheck,
  Car,
  Home,
  Baby,
  Zap,
} from 'lucide-react';

const getAmenityIcon = (amenity: string) => {
  const key = amenity.toLowerCase();

  if (key.includes('gym')) return <Dumbbell size={14} />;
  if (key.includes('pool')) return <Waves size={14} />;
  if (key.includes('garden') || key.includes('park')) return <Trees size={14} />;
  if (key.includes('security')) return <ShieldCheck size={14} />;
  if (key.includes('parking')) return <Car size={14} />;
  if (key.includes('power') || key.includes('backup')) return <Zap size={14} />;
  if (key.includes('kids')) return <Baby size={14} />;

  return <Home size={14} />; // fallback
};

export default function VisitProjectPage() {
  const params = useParams();

  const rawSlug = Array.isArray(params.slug)
    ? params.slug[0]
    : params.slug;

  const slug = rawSlug
    ? decodeURIComponent(rawSlug).toLowerCase().trim()
    : null;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    description: '',
    interest: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const mapRef = useRef<any>(null); // Ref to ProjectMap
  // 🔥 Fetch project by slug
  useEffect(() => {
    if (!slug) return;

    const fetchProject = async () => {
      try {
        const data = await projectsApi.getBySlug(slug);
        setProject(data);
      } catch (error) {
        console.error('Failed to fetch project:', error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [slug]);

  // Call useTracking unconditionally with a safe projectId
const { handleCallClick, handleWhatsAppClick, handleFormSubmit } = useTracking({
  projectId: project?.id || '', // empty string until project loads
});

  
  // ⏳ Loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading project…
      </div>
    );
  }

  // ❌ Not found
  if (!project) {
    return notFound();
  }

  const hasCoordinates =
  typeof project.latitude === 'number' &&
  typeof project.longitude === 'number';


  const downloadBrochure = async () => {
  if (!project?.brochureUrl) return;

  const res = await fetch(project.brochureUrl);
  const blob = await res.blob();

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Project_Brochure.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const handleWhatsApp = () => {
  handleWhatsAppClick?.();

  if (project.whatsappNumber?.startsWith('http')) {
    window.open(project.whatsappNumber, '_blank');
    return;
  }

  const cleanNumber = project.whatsappNumber?.replace(/\D/g, '') || '';
  const message = encodeURIComponent(
    `Hi, I'm interested in ${project.name} at ${project.location}, ${project.city}. Please share more details.`
  );

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = `whatsapp://send?phone=${cleanNumber}&text=${message}`;
  } else {
    window.open(
      `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${message}`,
      '_blank'
    );
  }
};

const handleCall = () => {
  handleCallClick?.();

  if (!project.callNumber && !project.whatsappNumber) {
    alert('Call not available');
    return;
  }

  const toNumber = (project.callNumber || project.whatsappNumber || '')
    .replace(/\D/g, '');

  if (!toNumber) {
    alert('Invalid phone number');
    return;
  }

  // Use native phone dialer
  window.location.href = `tel:+91${toNumber}`;
};

const handleFormOpen = () => setShowFormModal(true);

const handleFormClose = () => {
  setShowFormModal(false);
  setFormData({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    description: '',
    interest: '',
  });
  setFormSubmitted(false);
};

const handleFormSubmitAction = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const form = e.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  handleFormSubmit?.({
    ...formData,
    projectId: project.id,
    projectName: project.name,
  });
  setFormSubmitted(true);

  console.log('Form submitted:', {
    ...formData,
    projectId: project.id,
    projectName: project.name,
  });

  setTimeout(handleFormClose, 2000);
};

  return (
    <div className="relative min-h-screen bg-gray-100 lg:grid lg:grid-cols-[65%_35%]">
      {/* MAP */}
      <div className="relative h-[70vh] w-full lg:h-screen">
  {/* MAP */}
<div className="relative h-[70vh] w-full lg:h-screen">
  {hasCoordinates ? (
    <ProjectMap
    ref={mapRef}
      lat={project.latitude!}
      lng={project.longitude!}
      logo={project.coverImage}
      bhk='2 BHK'
      sqft='3200 sq.ft.'
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-gray-200 text-sm text-gray-600">
      Map location not available
    </div>
  )}

</div>


</div>

      
      {/* DETAILS */}
      <div className="fixed bottom-0 left-0 right-0 lg:static lg:h-screen lg:overflow-y-auto
                bg-white shadow-2xl">
        <button
          onClick={() => setOpen(!open)}
          className="w-full rounded-t-2xl bg-white py-3 text-sm font-semibold shadow lg:hidden"
        >
          {open ? 'Hide Project Details' : 'View Project Details'}
        </button>

        {(open || typeof window !== 'undefined' && window.innerWidth >= 1024) &&(
          <>
          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-4
                          max-h-[60vh] rounded-t-2xl
                          lg:max-h-none lg:rounded-none">
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-gray-600">{project.builderName}</p>

            <p className="mt-1 text-[12px]">
              {project.location}, {project.city}
            </p>
            <p className="mt-1 text-[12px] text-green-700">
              850 – 1200 sq.ft
            </p>

            {/* STATUS + RERA */}
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="  text-gray-700">
                {project.projectStatus.replace('-', ' ').toUpperCase()}
              </span>

              {project.reraApproved && project.reraNumber && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-gray-700">
                  RERA: {project.reraNumber}
                </span>
              )}
            </div>

              {/* BHK + PRICE CARD */}
<div className="mt-2 rounded-xl bg-white shadow-sm shadow-black/5">

  {/* TOP: BHK OPTIONS */}
  <div className="flex flex-wrap gap-1.5 p-2">
    {(project.bhkOptions ?? ['1 BHK', '2 BHK', '3 BHK']).map((bhk) => (
      <span
        key={bhk}
        className="rounded-full px-2.5 py-0.5 text-[11px] font-medium
                   text-gray-700 bg-gray-100/70"
      >
        {bhk}
      </span>
    ))}
  </div>

  {/* SOFT DIVIDER */}
  <div className="h-px bg-gray-100 mx-2" />

  {/* PRICE ROW */}
  <button
    onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
    className="w-full flex items-center justify-between p-2.5 text-left
               hover:bg-gray-50/50 rounded-b-xl transition"
  >
    <div>
      <p className="text-[11px] text-gray-500">Price starting from</p>
      <p className="text-sm font-semibold text-gray-900">
        ₹ 65 L onwards
      </p>
      <p
        className={`mt-0.5 text-[10px] ${
          project.bankLoanAvailable
            ? 'text-gray-600'
            : 'text-gray-500'
        }`}
      >
        Bank loan {project.bankLoanAvailable ? 'available' : 'not available'}
      </p>
    </div>

    <span
      className={`text-base text-gray-400 transition-transform ${
        showPriceBreakdown ? 'rotate-180' : ''
      }`}
    >
      ▾
    </span>
  </button>

  {/* DROPDOWN */}
  {showPriceBreakdown && (
    <div className="mx-2 mb-2 rounded-lg bg-gray-50 p-2
                    text-[11px] text-gray-700 space-y-1.5">

      {[
        ['MRP (₹ / sq.ft)', '₹ 5,200'],
        ['GST', '₹ 3,25,000'],
        ['Registration', '₹ 1,10,000'],
        ['Other Charges', '₹ 85,000'],
        ['Government Charges', '₹ 75,000'],
        ['Legal Charges', '₹ 50,000'],
      ].map(([label, value]) => (
        <div key={label} className="flex justify-between">
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}

      <div className="h-px bg-gray-200 my-1" />

      <div className="flex justify-between font-semibold text-gray-900">
        <span>Total</span>
        <span>₹ 72,45,000</span>
      </div>
    </div>
  )}
</div>

              {/* MAP ACTION BUTTONS */}
<div className="mt-4 grid grid-cols-3 gap-2">

  {/* DIRECTIONS */}
  <button
    onClick={() => mapRef.current?.getDirections()}
    className="flex flex-row items-center justify-center gap-1
               rounded-full bg-emerald-700 px-2 py-1.5
               text-[9px] sm:text-[10px] md:text-[11px]
               font-medium text-white
               hover:bg-emerald-800 transition shadow-sm"
  >
    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
    Directions
  </button>

  {/* 3D VIEW */}
  <button
    onClick={() => mapRef.current?.set3DView()}
    className="flex flex-row items-center justify-center gap-1
               rounded-full bg-emerald-700 px-2 py-1.5
               text-[9px] sm:text-[10px] md:text-[11px]
               font-medium text-white
               hover:bg-emerald-800 transition shadow-sm"
  >
    <Map className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
    3D View
  </button>

  {/* VIRTUAL / STREET VIEW */}
  <button
    onClick={() => mapRef.current?.toggleStreetView()}
    className="flex flex-row items-center justify-center gap-1
               rounded-full bg-emerald-700 px-2 py-1.5
               text-[9px] sm:text-[10px] md:text-[11px]
               font-medium text-white
               hover:bg-emerald-800 transition shadow-sm"
  >
    <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
    Virtual View
  </button>

</div>

              {/* COVER IMAGE */}
              {project.coverImage && (
              <div className="mt-5 w-full flex justify-center">
                <Image
                  src={project.coverImage}
                  alt={project.name}
                  width={200}
                  height={120}
                  className="rounded-lg object-cover shadow-md"
                  unoptimized={false}
                  priority
                />
              </div>
            )}

{/* AMENITIES */}
{project.amenities?.length > 0 && (
  <div className="mt-4 rounded-xl  p-4">
    <p className="mb-3 text-sm font-semibold text-gray-900">
      Amenities
    </p>

    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {project.amenities.map((amenity) => (
        <div
          key={amenity}
          className="flex items-center gap-2 text-xs text-gray-700"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm">
            {getAmenityIcon(amenity)}
          </span>
          <span>{amenity}</span>
        </div>
      ))}
    </div>
  </div>
)}
            {/* GALLERY IMAGES */}
            {Array.isArray(project.galleryImages) && project.galleryImages.length > 0 && (
              <div className="mt-3 ml-3">
                <p className="text-sm font-semibold mb-1">Gallery</p>
                <div className="flex gap-2 overflow-x-auto py-1
                                lg:grid lg:grid-cols-3 lg:gap-3 lg:overflow-visible">
                  {project.galleryImages.map((img, i) => (
                    <Image
                      key={i}
                      src={img}
                      alt={`${project.name} gallery ${i + 1}`}
                      width={120}
                      height={80}
                      className="rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}


            {/* VIDEOS */}
            {Array.isArray(project.videos) && project.videos.length > 0 && (
              <div className="mt-4 rounded-xl  p-4">
                <p className="mb-2 text-sm font-semibold ">Videos</p>
                <div className="flex flex-col gap-3">
                  {project.videos.map((vid, i) => (
                    <video
                      key={i}
                      src={vid}
                      controls
                      preload="metadata"
                      className="w-full max-w-sm max-h-[200px] rounded-lg object-cover bg-black"
                    />
                  ))}
                </div>
              </div>
            )}




{/* FLAT DETAILS
{project.type === 'flat' && (
   <div className="mt-4 rounded-xl border bg-gray-50 p-4">
      <p className="mb-2 text-sm font-semibold">Flat Details</p>
      <div className="text-sm space-y-1 text-gray-700">
        {project.carpetAreaRange && (
          <p><strong>Carpet Area:</strong> {project.carpetAreaRange}</p>
        )}
        {project.floorRange && (
          <p><strong>Floors:</strong> {project.floorRange}</p>
        )}
      </div>
    </div>
)} */}

{/* PLOT DETAILS */}
{project.type === 'plot' && (
   <div className="mt-4 rounded-xl border bg-gray-50 p-4">
      <p className="mb-2 text-sm font-semibold">Plot Details</p>
      <div className="text-sm space-y-1 text-gray-700">
        {project.plotSizeRange && (
          <p><strong>Plot Size:</strong> {project.plotSizeRange}</p>
        )}
        {project.facingOptions && (
          <p><strong>Facing:</strong> {project.facingOptions.join(', ')}</p>
        )}
        {typeof project.gatedCommunity === 'boolean' && (
          <p>
            <strong>Gated Community:</strong>{' '}
            {project.gatedCommunity ? 'Yes' : 'No'}
          </p>
        )}
      </div>
    </div>
)}

{/* BROCHURE */}
{project.brochureUrl && (
  <div className="mt-3 ml-3">
    <button
  onClick={downloadBrochure}
  className="inline-flex items-center gap-1 rounded-lg
             border border-green-600 text-green-700
             bg-green-50 px-2 py-1 text-[13px] font-semibold
             hover:bg-green-100 transition"
>
  Download Brochure
</button>

  </div>
)}

</div>
    {/* CTA */}
<div
  className="border-t bg-white p-2
             lg:sticky lg:bottom-0
             shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
>
  <div className="grid grid-cols-3 gap-1.5">

    {/* CALL */}
    <button
      onClick={handleCall}
      className="rounded-md bg-blue-600 py-1.5
                 text-[11px] font-semibold text-white
                 hover:bg-blue-700 transition"
    >
      Call
    </button>

    {/* WHATSAPP */}
    <button
      onClick={handleWhatsApp}
      className="rounded-md bg-[#25D366] py-1.5
                 text-[11px] font-semibold text-white
                 hover:bg-[#1EBE5D] transition"
    >
      WhatsApp
    </button>

    {/* ENQUIRY */}
    <button
      onClick={handleFormOpen}
      className="rounded-md bg-teal-600 py-1.5
                 text-[11px] font-semibold text-white
                 hover:bg-teal-700 transition"
    >
      {project.ctaButtonText || 'Enquiry'}
    </button>

  </div>
</div>

        </>
      )}
    </div>

    {/* Lead Capture Form Modal */}
{showFormModal && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center"
    onClick={handleFormClose}
  >
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

    {/* Modal Wrapper */}
    <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
      <div
        className="w-full max-w-md md:max-w-3xl lg:max-w-4xl
                   bg-white rounded-2xl border border-[#E7E5E4]
                   shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {!formSubmitted ? (
          <div className="max-h-[90vh] overflow-y-auto grid md:grid-cols-2">

            {/* LEFT (desktop only) */}
            <div className="hidden md:block pl-12 pr-6 py-12 bg-white">
              <span className="text-xs font-semibold text-green-500 uppercase block mb-4">
                Contact
              </span>

              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Get in touch
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed">
                Use our contact form for all information requests.
                <br /><br />
                All information is treated confidentially.
              </p>

              <div className="mt-6 space-y-1 text-sm">
                <p className="text-green-500 font-medium">info@homeintown.com</p>
                <p className="text-green-500 font-medium">+91 98765 43210</p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="px-10 pt-16 pb-12 bg-[#F7FAF9] relative">

              {/* Close */}
              <button
                onClick={handleFormClose}
                className="absolute top-4 right-4 p-2 rounded-lg
                           text-[#A8A29E] hover:text-[#57534E]"
              >
                ✕
              </button>

              {/* FORM */}
              <form onSubmit={handleFormSubmitAction} className="space-y-3">

                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    minLength={2}
                    placeholder="First name *"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="border rounded-md px-2 py-1.5 text-xs"
                  />

                  <input
                    required
                    minLength={2}
                    placeholder="Last name *"
                    value={formData.lastName}
                    onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })}
                    className="border rounded-md px-2 py-1.5 text-xs"
                  />
                </div>

                <input
                  required
                  type="email"
                  placeholder="Email address *"
                   value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })}
                  className="border rounded-md px-2 py-1.5 text-xs w-full"
                />

                <input
                  required
                  type="tel"
                  placeholder="Phone number *"
                  pattern="^[6-9]\d{9}$"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      phone: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="border rounded-md px-2 py-1.5 text-xs w-full"
                />

                <textarea
                  required
                  rows={3}
                  minLength={10}
                  placeholder="Message *"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="border rounded-md px-2 py-1.5 text-xs w-full resize-none"
                />

                <select required 
                 value={formData.interest}
                  onChange={(e) =>
                    setFormData({ ...formData, interest: e.target.value })}
                className="border rounded-md px-2 py-1.5 text-xs w-full">
                  <option value="">What are you interested in? *</option>
                  <option>Buying a Flat</option>
                  <option>Buying a Plot</option>
                  <option>Site Visit</option>
                  <option>Investment</option>
                </select>

                <p className="text-[10px] text-gray-500">
                  By submitting, you agree to our data protection policy.
                </p>

                <button
                  type="submit"
                  className="w-full bg-green-500 text-white py-2 rounded-md
                             text-xs font-semibold hover:bg-green-600"
                >
                  Submit
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* SUCCESS */
          <div className="p-8 text-center bg-[#FAF7F2]">
            <h4 className="text-xl font-bold mb-2">Thank You!</h4>
            <p className="text-gray-600">
              Your enquiry has been submitted successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  </div>
)}

  </div>
);}
