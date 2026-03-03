import {
  SwimmingPool,
  Barbell,
  Car,
  TreePalm,
  ShieldCheck,
  Basketball,
  Elevator,
  Lightning,
  Users,
  WifiHigh,
  FirstAid,
  Storefront,
  HouseLine,
} from "@phosphor-icons/react";

type Props = {
  amenities?: string[];
  variant?: "desktop" | "mobile";
};

const getAmenityVisual = (amenity: string) => {
  const name = amenity.toLowerCase();

  const map = [
    { match: ["pool", "swim"], icon: SwimmingPool, bg: "bg-cyan-100", color: "text-cyan-600" },
    { match: ["gym", "fitness"], icon: Barbell, bg: "bg-rose-100", color: "text-rose-600" },
    { match: ["parking", "car"], icon: Car, bg: "bg-indigo-100", color: "text-indigo-600" },
    { match: ["garden", "park"], icon: TreePalm, bg: "bg-green-100", color: "text-green-600" },
    { match: ["security"], icon: ShieldCheck, bg: "bg-emerald-100", color: "text-emerald-600" },
    { match: ["sports", "court"], icon: Basketball, bg: "bg-orange-100", color: "text-orange-600" },
    { match: ["lift", "elevator"], icon: Elevator, bg: "bg-gray-100", color: "text-gray-700" },
    { match: ["power", "backup"], icon: Lightning, bg: "bg-yellow-100", color: "text-yellow-600" },
    { match: ["club"], icon: Users, bg: "bg-purple-100", color: "text-purple-600" },
    { match: ["wifi", "internet"], icon: WifiHigh, bg: "bg-sky-100", color: "text-sky-600" },
    { match: ["medical"], icon: FirstAid, bg: "bg-red-100", color: "text-red-600" },
    { match: ["shop"], icon: Storefront, bg: "bg-pink-100", color: "text-pink-600" },
  ];

  return (
    map.find(item => item.match.some(k => name.includes(k))) || {
      icon: HouseLine,
      bg: "bg-gray-100",
      color: "text-gray-600",
    }
  );
};

export default function AmenitiesSection({ amenities, variant = "desktop" }: Props) {
  if (!amenities?.length) return null;

  const isMobile = variant === "mobile";

  return (
    <div className={isMobile ? "mt-4 rounded-xl p-4" : "mt-10"}>
      
      {/* Title */}
      <p className={`font-semibold text-gray-900 ${isMobile ? "text-sm mb-3" : "text-lg mb-5"}`}>
        Top Facilities
      </p>

      {/* GRID */}
      <div
        className={
          isMobile
            ? "grid grid-cols-2 gap-x-4 gap-y-2"
            : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
        }
      >
        {amenities.map((amenity, i) => {
          const visual = getAmenityVisual(amenity);
          const Icon = visual.icon;

          // ✅ MOBILE UI
          if (isMobile) {
            return (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-gray-700"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm">
                  <Icon size={14} className={visual.color} />
                </span>
                <span>{amenity}</span>
              </div>
            );
          }

          // ✅ DESKTOP UI
          return (
            <div
              key={i}
              className="
                flex items-center gap-3
                bg-white
                rounded-xl md:rounded-2xl
                p-3 md:p-4
                hover:shadow-sm transition
              "
            >
              <div
                className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center ${visual.bg}`}
              >
                <Icon
                  size={20}
                  weight="duotone"
                  className={visual.color}
                />
              </div>

              <p className="text-xs md:text-sm font-medium text-gray-800">
                {amenity}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}