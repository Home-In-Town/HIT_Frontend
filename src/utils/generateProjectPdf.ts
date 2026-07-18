import { ShareContactInfo } from '@/lib/api';

interface ProjectDataForPdf {
  id: string;
  name: string;
  type: string;
  city: string;
  location?: string;
  price?: number;
  startingPrice?: number;
  pricePerSqFt?: number;
  priceRange?: string;
  area?: string;
  bhkOptions?: string[];
  amenities?: string[];
  coverImage?: string | null;
  galleryImages?: string[];
  layoutImage?: string | null;
  slug?: string;
  reraApproved?: boolean;
  reraNumber?: string;
  projectStatus?: string;
  bankLoanAvailable?: boolean;
  gatedCommunity?: boolean;
  floorRange?: string;
  facingOptions?: string[];
  paymentPlan?: string;
  landmarks?: { name: string; type: string }[];
}

// ─── Helpers ───────────────────────────────────────────────────────

function pdfPrice(price: number | undefined): string {
  if (!price || price === 0) return 'Price on Request';
  if (price >= 10000000) return `Rs. ${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `Rs. ${(price / 100000).toFixed(1)} Lac`;
  return `Rs. ${price.toLocaleString('en-IN')}`;
}

function statusLabel(status: string | undefined): string {
  switch (status) {
    case 'pre-launch': return 'Pre-Launch';
    case 'under-construction': return 'Under Construction';
    case 'ready-to-move': return 'Ready to Move';
    default: return status || '';
  }
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    // Proxy R2 URLs through Next.js rewrite to avoid CORS issues
    let fetchUrl = url;
    const R2_HOST = 'pub-daa9113fecb449cfb19044d3d822effd.r2.dev';
    if (url.includes(R2_HOST)) {
      const path = url.split(R2_HOST)[1];
      fetchUrl = `/r2-assets${path}`;
    }

    const response = await fetch(fetchUrl);
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadImageWithDimensions(url: string): Promise<{ data: string; w: number; h: number } | null> {
  const dataUrl = await loadImageAsDataUrl(url);
  if (!dataUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ data: dataUrl, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// ─── Main PDF Generator ────────────────────────────────────────────

export async function generateProjectPdf(
  property: ProjectDataForPdf,
  contact: ShareContactInfo,
  shareUrl: string
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth(); // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const m = 12;

  const AMBER: [number, number, number] = [180, 83, 9];
  const DARK: [number, number, number] = [28, 25, 23];
  const LIGHT_BG: [number, number, number] = [248, 245, 240];
  const GREY: [number, number, number] = [100, 95, 90];
  const MUTED: [number, number, number] = [160, 155, 150];
  const WHITE: [number, number, number] = [255, 255, 255];

  const price = property.price || property.startingPrice || 0;

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 1: COVER IMAGE (top 40%) + PROPERTY DETAILS (bottom 60%)
  // ═══════════════════════════════════════════════════════════════════

  const coverH = 110; // ~37% of page height for cover area

  // Cover image or dark fallback
  let coverLoaded = false;
  if (property.coverImage) {
    const imgData = await loadImageAsDataUrl(property.coverImage);
    if (imgData) {
      coverLoaded = true;
      doc.addImage(imgData, 'JPEG', 0, 0, pw, coverH);
    }
  }
  if (!coverLoaded) {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pw, coverH, 'F');
  }

  // Dark scrim on bottom of cover for text readability
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.7 }));
  doc.setFillColor(0, 0, 0);
  doc.rect(0, coverH - 42, pw, 42, 'F');
  (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));

  // Project name over cover
  doc.setTextColor(...WHITE);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(property.name, m, coverH - 22);

  // Location
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 220);
  const loc = `${property.location || ''}, ${property.city}`.replace(/^, /, '');
  doc.text(loc.substring(0, 60), m, coverH - 12);

  // Price badge (top-right of cover)
  const priceText = pdfPrice(price);
  doc.setFillColor(...AMBER);
  const badgeW = doc.getTextWidth(priceText) + 10;
  doc.roundedRect(pw - badgeW - m, 8, badgeW, 9, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(priceText, pw - badgeW - m + 5, 14);

  // Status + type on cover
  if (property.projectStatus || property.type) {
    const chips = [
      property.type ? property.type.charAt(0).toUpperCase() + property.type.slice(1) : '',
      statusLabel(property.projectStatus),
      property.reraApproved ? 'RERA Approved' : '',
    ].filter(Boolean);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    let cx = m;
    chips.forEach((chip) => {
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.3 }));
      const cw = doc.getTextWidth(chip) + 6;
      doc.setFillColor(...WHITE);
      doc.roundedRect(cx, coverH - 6, cw, 5, 1, 1, 'F');
      (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
      doc.setTextColor(...WHITE);
      doc.text(chip, cx + 3, coverH - 2.5);
      cx += cw + 3;
    });
  }

  // ─── Details section below cover ─────────────────────────────────
  let y = coverH + 8;

  // Section: Key Facts (compact 3-column grid)
  doc.setFillColor(...AMBER);
  doc.rect(m, y, 22, 0.8, 'F');
  y += 6;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Property Details', m, y);
  y += 8;

  const details: { label: string; value: string }[] = [
    { label: 'Type', value: (property.type || 'Flat').charAt(0).toUpperCase() + (property.type || 'flat').slice(1) },
    { label: 'Configuration', value: property.bhkOptions?.length ? property.bhkOptions.join(', ') : '-' },
    { label: 'Starting Price', value: pdfPrice(price) },
    { label: 'Rate', value: property.pricePerSqFt ? `Rs. ${property.pricePerSqFt.toLocaleString('en-IN')}/sqft` : 'On Request' },
    { label: 'Carpet Area', value: property.area || 'On Request' },
    { label: 'Floors', value: property.floorRange || '-' },
    { label: 'Status', value: statusLabel(property.projectStatus) || '-' },
    { label: 'Payment Plan', value: property.paymentPlan || 'Flexible' },
    { label: 'Bank Loan', value: property.bankLoanAvailable ? 'Available' : '-' },
  ].filter(d => d.value && d.value !== '-');

  const cols = 3;
  const cellW = (pw - m * 2) / cols;
  const cellH = 14;

  details.forEach((item, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx = m + col * cellW;
    const cy = y + row * cellH;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(item.label.toUpperCase(), cx, cy);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(item.value, cx, cy + 5);
  });

  y += Math.ceil(details.length / cols) * cellH + 6;

  // ─── Amenities (inline chips) ────────────────────────────────────
  if (property.amenities && property.amenities.length > 0) {
    doc.setFillColor(...AMBER);
    doc.rect(m, y, 22, 0.8, 'F');
    y += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Amenities', m, y);
    y += 7;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    let ax = m;

    property.amenities.slice(0, 12).forEach((amenity) => {
      const tw = doc.getTextWidth(amenity) + 7;
      if (ax + tw > pw - m) { ax = m; y += 7; }
      doc.setFillColor(...LIGHT_BG);
      doc.roundedRect(ax, y - 3, tw, 5.5, 1.2, 1.2, 'F');
      doc.setTextColor(...GREY);
      doc.text(amenity, ax + 3.5, y);
      ax += tw + 2;
    });
    y += 10;
  }

  // ─── RERA info ───────────────────────────────────────────────────
  if (property.reraApproved && property.reraNumber) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(`RERA Registration: ${property.reraNumber}`, m, y);
    y += 6;
  }

  // ─── Contact Card (bottom of page 1) ────────────────────────────
  // Position contact at bottom of page 1 to fill remaining space
  const contactCardH = 30;
  const contactY = Math.max(y + 8, ph - contactCardH - 20);

  doc.setFillColor(...DARK);
  doc.roundedRect(m, contactY, pw - m * 2, contactCardH, 3, 3, 'F');

  // Amber left accent
  doc.setFillColor(...AMBER);
  doc.rect(m, contactY, 2.5, contactCardH, 'F');

  const cardX = m + 10;

  // Contact name + role
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...WHITE);
  doc.text(contact.name, cardX, contactY + 9);

  const roleLabel = contact.role === 'captain' ? 'Sales Captain' : contact.role === 'agent' ? 'Property Agent' : contact.role;
  const subtitle = [roleLabel, contact.companyName].filter(Boolean).join(' | ');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...AMBER);
  doc.text(subtitle, cardX, contactY + 15);

  // Phone + Email on right side
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...WHITE);
  doc.text(contact.phone, cardX, contactY + 23);

  if (contact.email) {
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(contact.email, cardX + 60, contactY + 23);
  }

  // Share URL (small, right-aligned in contact)
  doc.setFontSize(6.5);
  doc.setTextColor(...AMBER);
  const urlW = doc.getTextWidth(shareUrl);
  doc.text(shareUrl, pw - m - urlW - 5, contactY + 9);

  // ═══════════════════════════════════════════════════════════════════
  // PAGE 2: GALLERY (only if there are images)
  // ═══════════════════════════════════════════════════════════════════
  const allImages: string[] = [];
  if (property.galleryImages?.length) {
    allImages.push(...property.galleryImages.slice(0, 6));
  }
  if (property.layoutImage) {
    allImages.push(property.layoutImage);
  }

  if (allImages.length > 0) {
    doc.addPage();
    y = 14;

    doc.setFillColor(...AMBER);
    doc.rect(m, y, 22, 0.8, 'F');
    y += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('Gallery', m, y);
    y += 8;

    if (allImages.length === 1) {
      // Single image — make it large and centered
      const imgResult = await loadImageWithDimensions(allImages[0]);
      if (imgResult) {
        const maxW = pw - m * 2;
        const maxH = ph - y - 30;
        const ratio = imgResult.w / imgResult.h;
        let imgW = maxW;
        let imgH = imgW / ratio;
        if (imgH > maxH) { imgH = maxH; imgW = imgH * ratio; }
        const imgX = m + (maxW - imgW) / 2;
        doc.addImage(imgResult.data, 'JPEG', imgX, y, imgW, imgH);
      }
    } else {
      // Multiple images in grid
      const gap = 3;
      const colW2 = (pw - m * 2 - gap) / 2;
      let imgCol = 0;

      // First image wider (full width)
      const firstImg = await loadImageWithDimensions(allImages[0]);
      if (firstImg) {
        const fullW = pw - m * 2;
        const imgH = Math.min((firstImg.h / firstImg.w) * fullW, 80);
        doc.addImage(firstImg.data, 'JPEG', m, y, fullW, imgH);
        y += imgH + gap;
      }

      // Remaining images in 2-col grid
      const thumbH = 50;
      for (let i = 1; i < allImages.length && i < 7; i++) {
        if (y + thumbH > ph - 20) break;

        const imgResult = await loadImageWithDimensions(allImages[i]);
        if (!imgResult) continue;

        const x = m + imgCol * (colW2 + gap);
        doc.addImage(imgResult.data, 'JPEG', x, y, colW2, thumbH);
        imgCol++;
        if (imgCol >= 2) { imgCol = 0; y += thumbH + gap; }
      }
    }

    // Location at bottom of gallery page if space
    const remainingSpace = ph - y - 25;
    if (remainingSpace > 25 && (property.landmarks?.length || property.location)) {
      y = ph - 45;
      doc.setFillColor(...AMBER);
      doc.rect(m, y, 22, 0.8, 'F');
      y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK);
      doc.text('Location', m, y);
      y += 6;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GREY);
      doc.text(loc.substring(0, 80), m, y);
      y += 5;

      if (property.landmarks && property.landmarks.length > 0) {
        property.landmarks.slice(0, 4).forEach((lm) => {
          doc.text(`  - ${lm.name}`, m, y);
          y += 4;
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // FOOTER ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════════
  const totalPages = (doc as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setFillColor(...AMBER);
    doc.rect(m, ph - 9, pw - m * 2, 0.3, 'F');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('HomeInTown', m, ph - 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    const bw2 = doc.getTextWidth('HomeInTown');
    doc.text('  |  Premium Property Brochure', m + bw2, ph - 5);

    if (totalPages > 1) {
      const pg = `${i} / ${totalPages}`;
      doc.text(pg, (pw - doc.getTextWidth(pg)) / 2, ph - 5);
    }

    if (property.slug) {
      const footerUrl = `homeintown.in/visit/${property.slug}`;
      doc.setTextColor(...AMBER);
      doc.text(footerUrl, pw - m - doc.getTextWidth(footerUrl), ph - 5);
    }
  }

  // ─── Save ────────────────────────────────────────────────────────
  const fileName = `${property.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}_Brochure.pdf`;
  doc.save(fileName);
}
