// The builder's layout drawing laid over the map on the Public_Plot_Page.
//
// Placement: the server sends the 4 ground corners (NW, NE, SE, SW). The image
// is drawn at its own natural size and mapped onto those corners with one CSS
// affine matrix from the projected NW, NE and SW points (design 7.2), so the
// page puts the picture exactly where the editor, the API and the mobile app
// put it. The corners come from the shared transform in layoutTools.mjs
// (`corners`), used as the fallback when an older response has none; the page
// has no transform of its own.
//
// Images: the Preview_Copy first, and the sharper image once one preview pixel
// covers more than one device pixel (chooseOverlayImage). The preview stays on
// screen until the sharper image has decoded, so there is never a blank flash.
//
// Factory (not a class at module level) because OverlayView exists only after
// the Maps script has loaded.

import { corners as sharedCorners } from '@/lib/layoutTools.mjs';
import { chooseOverlayImage } from '@/lib/plotViewer.mjs';
import type { LatLngLit, PublicOverlay } from '@/types/plots';

export interface OverlayLayer {
  setMap(map: google.maps.Map | null): void;
  setOpacity(opacity: number): void;
  /** Called with true once every usable image failed to load. */
  onUnavailable: ((unavailable: boolean) => void) | null;
}

function groundCorners(o: PublicOverlay): LatLngLit[] {
  const c = o.corners;
  if (Array.isArray(c) && c.length === 4 && c.every((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng))) return c;
  return sharedCorners({ center: o.center, widthM: o.widthM, heightM: o.heightM, rotationDeg: o.rotationDeg });
}

export function createPublicOverlayLayer(g: typeof google, overlay: PublicOverlay): OverlayLayer {
  const corners = groundCorners(overlay).map((p) => new g.maps.LatLng(p.lat, p.lng));
  const urls = { image: overlay.image?.url ?? null, preview: overlay.previewUrl, detail: overlay.detailUrl };
  const deviceMemory = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null : null;

  class Layer extends g.maps.OverlayView implements OverlayLayer {
    onUnavailable: ((unavailable: boolean) => void) | null = null;
    private img = document.createElement('img');
    private failures: { preview?: boolean; detail?: boolean; image?: boolean } = {};
    private shownKind: 'preview' | 'detail' | 'image' | null = null;
    private loading = false;
    private zoomRatio = 0;

    constructor() {
      super();
      // Decorative: plot numbers and statuses are exposed by the plot list and
      // the polygons; the drawing adds nothing a screen reader can use.
      this.img.alt = '';
      this.img.setAttribute('aria-hidden', 'true');
      this.img.draggable = false;
      Object.assign(this.img.style, {
        position: 'absolute', left: '0', top: '0', maxWidth: 'none', pointerEvents: 'none',
        transformOrigin: '0 0', opacity: String(overlay.opacity), visibility: 'hidden',
      });
    }

    setOpacity(opacity: number) { this.img.style.opacity = String(opacity); }

    onAdd() {
      // mapPane: just above the tiles, so plot polygons stay on top and clickable.
      this.getPanes()?.mapPane.appendChild(this.img);
      this.pick();
    }

    onRemove() { this.img.remove(); }

    // Load the image chooseOverlayImage wants, keep showing the current one
    // until it has decoded, and fall back on failure (R21.7).
    private pick() {
      if (this.loading) return;
      const choice = chooseOverlayImage({ platform: 'web', deviceMemory, zoomRatio: this.zoomRatio, urls, failures: this.failures });
      this.onUnavailable?.(choice.unavailable);
      if (!choice.url || !choice.kind || choice.kind === this.shownKind) return;
      const kind = choice.kind;
      const url = choice.url;
      this.loading = true;
      const next = new Image();
      next.src = url;
      next.decode().then(() => {
        this.loading = false;
        this.img.src = url;
        this.shownKind = kind;
        this.img.style.visibility = 'visible';
        this.draw();
        this.pick(); // the zoom may have moved while it loaded
      }).catch(() => {
        this.loading = false;
        this.failures = { ...this.failures, [kind]: true };
        this.pick();
      });
    }

    draw() {
      const proj = this.getProjection();
      if (!proj || !this.shownKind) return;
      const [nw, ne, , sw] = corners.map((c) => proj.fromLatLngToDivPixel(c));
      const w = this.img.naturalWidth;
      const h = this.img.naturalHeight;
      if (!nw || !ne || !sw || !w || !h) return;
      // Image pixel (x, y) -> NW + x/W * (NE - NW) + y/H * (SW - NW).
      const a = (ne.x - nw.x) / w;
      const b = (ne.y - nw.y) / w;
      const c = (sw.x - nw.x) / h;
      const d = (sw.y - nw.y) / h;
      this.img.style.width = `${w}px`;
      this.img.style.height = `${h}px`;
      this.img.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${nw.x}, ${nw.y})`;

      // One preview pixel covers more than one device pixel when the overlay is
      // drawn wider (in device pixels) than the Preview_Copy is.
      const previewW = urls.preview && this.shownKind === 'preview' ? w : (overlay.imageSize ? Math.min(overlay.imageSize.width, 2048) : w);
      const onScreenW = Math.hypot(ne.x - nw.x, ne.y - nw.y) * (window.devicePixelRatio || 1);
      const ratio = previewW > 0 ? onScreenW / previewW : 0;
      if ((ratio > 1) !== (this.zoomRatio > 1)) {
        this.zoomRatio = ratio;
        this.pick();
      } else {
        this.zoomRatio = ratio;
      }
    }
  }
  return new Layer();
}
