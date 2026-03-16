'use client';

import { useState, useEffect, useRef } from 'react';
import { employeeApi } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  ClipboardList, 
  Clock, 
  Navigation, 
  Power, 
  History, 
  LayoutDashboard,
  LogOut,
  User,
  Activity,
  ChevronRight,
  Shield,
  Zap,
  CheckCircle2,
  PhoneCall,
  Plus,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, Circle, Autocomplete } from '@react-google-maps/api';

const LIBRARIES: any = ["places"];

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
};

export default function EmployeeDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isTracking, setIsTracking] = useState(false);
    const [lastPosition, setLastPosition] = useState<{lat: number, lng: number} | null>(null);
    const [placeName, setPlaceName] = useState<string | null>(null);
    const [myHistory, setMyHistory] = useState<any>(null);
    const [loadingHistory, setLoadingHistory] = useState(true);
    
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: LIBRARIES
    });

    // Meeting form
    const [meetingWith, setMeetingWith] = useState('');
    const [meetingDesc, setMeetingDesc] = useState('');
    const [projectName, setProjectName] = useState('');
    const [projectLocationField, setProjectLocationField] = useState('');
    const [projectPrice, setProjectPrice] = useState('');
    const [submittingMeeting, setSubmittingMeeting] = useState(false);
    
    // Map selection states
    const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null);
    const [pointedLocation, setPointedLocation] = useState<{lat: number, lng: number} | null>(null);
    const [isLocationValid, setIsLocationValid] = useState(true);
    const [pointingAddress, setPointingAddress] = useState('');
    const meetingMapRef = useRef<any>(null);
    const autocompleteRef = useRef<any>(null);
    const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Request GPS lock for meeting form map when component mounts
    useEffect(() => {
        if (navigator.geolocation) {
             // Try to get cached position first (extremely fast)
             navigator.geolocation.getCurrentPosition(
                 (pos) => {
                     const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                     setMapCenter(prev => prev || current);
                     setPointedLocation(prev => prev || current);
                 },
                 undefined,
                 { enableHighAccuracy: false, maximumAge: 300000, timeout: 5000 }
             );

             // Then get fresh high accuracy position
             navigator.geolocation.getCurrentPosition((pos) => {
                 const current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                 setMapCenter(current);
                 setPointedLocation(current);
                 
                 // Initial Geocode
                 if (typeof google !== 'undefined') {
                     const geocoder = new google.maps.Geocoder();
                     geocoder.geocode({ location: current }, (results, status) => {
                         if (status === 'OK' && results?.[0]) {
                             setPointingAddress(results[0].formatted_address);
                         }
                     });
                 }
             }, undefined, { enableHighAccuracy: true, timeout: 10000 });
        }
    }, []);


    useEffect(() => {
        if (user && (user.id || (user as any)._id)) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        try {
            const userId = user?.id || (user as any)?._id;
            if (!userId) return;
            const data = await employeeApi.getHistory(userId);
            setMyHistory(data);

            // Seed map center from last known location if map hasn't found one yet
            if (!mapCenter && data.locations && data.locations.length > 0) {
                const last = { 
                    lat: data.locations[0].latitude, 
                    lng: data.locations[0].longitude 
                };
                setMapCenter(last);
                setPointedLocation(last);
                if (data.locations[0].placeName) {
                    setPointingAddress(data.locations[0].placeName);
                }
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const onMapIdle = () => {
        if (meetingMapRef.current && mapCenter) {
            const center = meetingMapRef.current.getCenter();
            const newPos = { lat: center.lat(), lng: center.lng() };
            setPointedLocation(newPos);
            const dist = getDistance(mapCenter.lat, mapCenter.lng, newPos.lat, newPos.lng);
            setIsLocationValid(dist <= 500);

            // Debounced Reverse Geocoding
            if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
            geocodeTimeoutRef.current = setTimeout(() => {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: newPos }, (results, status) => {
                    if (status === 'OK' && results?.[0]) {
                        setPointingAddress(results[0].formatted_address);
                    } else if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
                        // Fallback to coordinates if API is disabled or limit reached
                        setPointingAddress(`COORDS: ${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`);
                    }
                });
            }, 600);
        }
    };

    const onPlaceChanged = () => {
        if (autocompleteRef.current !== null) {
            const place = autocompleteRef.current.getPlace();
            if (place.geometry && place.geometry.location) {
                const newPos = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                
                setPointingAddress(place.formatted_address || '');
                
                // For soft search, we center the map on the place
                // MapIdle will then trigger validation and update pointedLocation
                if (meetingMapRef.current) {
                    meetingMapRef.current.panTo(newPos);
                    meetingMapRef.current.setZoom(17);
                }
            }
        }
    };

    const resolvePlace = async (lat: number, lng: number): Promise<string> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();
            const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setPlaceName(addr);
            return addr;
        } catch {
            const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            setPlaceName(fallback);
            return fallback;
        }
    };

    const startTracking = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation not supported by this browser");
            return;
        }

        setIsTracking(true);
        toast.success("Operational Tether Established");

        // Immediate post on button click
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                setLastPosition({ lat: latitude, lng: longitude });
                const address = await resolvePlace(latitude, longitude);
                await employeeApi.submitLocation(latitude, longitude, address);
                fetchHistory();
            },
            (err) => {
                toast.error("Location access denied");
                setIsTracking(false);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    };

    const stopTracking = () => {
        setIsTracking(false);
        setLastPosition(null);
        setPlaceName(null);
        toast("Tether Disconnected", { icon: '📴' });
    };

    const handleLogMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!meetingWith || !meetingDesc) return;
        if (!pointedLocation) {
            toast.error("Please select a location on the map first");
            return;
        }

        setSubmittingMeeting(true);
        try {
            const isEmployerAdmin = user?.employerId && typeof user.employerId === 'object' && 'role' in user.employerId && user.employerId.role === 'admin';
            
            await employeeApi.logMeeting({
                withWhom: meetingWith,
                description: meetingDesc,
                latitude: pointedLocation.lat,
                longitude: pointedLocation.lng,
                placeName: pointingAddress,
                projectName: isEmployerAdmin ? projectName : undefined,
                projectLocation: isEmployerAdmin ? projectLocationField : undefined,
                projectPrice: isEmployerAdmin ? projectPrice : undefined
            });

            toast.success("Intelligence Logged Successfully");
            setMeetingWith('');
            setMeetingDesc('');
            setPointedLocation(mapCenter); // reset back to current pos instead of null
            fetchHistory();
        } catch (error: any) {
            toast.error(error.message || "Failed to log meeting");
        } finally {
            setSubmittingMeeting(false);
        }
    };

    const handleLogout = async () => {
        stopTracking();
        await logout();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-[#FAF7F2] relative pb-24">
            {/* Header / HUD */}
            <div className="bg-white border-b border-[#E7E5E4] px-4 md:px-6 py-4 sticky top-0 z-30 shadow-sm shadow-[#B45309]/5">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`} />
                        <div>
                            <h1 className="text-sm font-black text-[#2A2A2A] font-serif uppercase tracking-widest leading-none">Field Terminal</h1>
                            <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5 font-mono">
                                <Shield className="w-2.5 h-2.5" /> Secure Link Established
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-2 text-[#A8A29E] hover:text-red-500 bg-[#FAF7F2] rounded-xl border border-[#E7E5E4] transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
                {/* Upper Section: Personnel & Pulse */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                    {/* Compact Agent Identity Card */}
                    <div className="lg:col-span-7 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-[#E7E5E4] p-4 md:p-6 shadow-sm shadow-[#B45309]/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-[#B45309] opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                            <User className="w-24 h-24" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-[#B45309] to-[#92400E] rounded-2xl flex items-center justify-center text-white text-xl font-bold font-serif shadow-md">
                                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl font-bold text-[#2A2A2A] font-serif truncate leading-tight tracking-tight">{user?.name}</h1>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <Badge variant="outline" className="text-[8px] font-black h-4.5 bg-orange-50 text-orange-700 border-orange-100 uppercase tracking-widest px-1.5 shadow-sm">
                                            Active Operative
                                        </Badge>
                                        <span className="text-[9px] font-mono font-bold text-[#A8A29E] tracking-tighter">{user?.phone}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <div className="bg-[#FAF7F2]/40 p-3.5 rounded-2xl border border-[#E7E5E4]/50 group/stat">
                                    <div className="flex items-center gap-1.5 mb-1.5 text-[#A8A29E]">
                                        <Navigation className="w-3 h-3 group-hover/stat:text-[#B45309] transition-colors" />
                                        <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Status</span>
                                    </div>
                                    <p className={`text-xs font-bold font-serif ${isTracking ? 'text-emerald-600' : 'text-[#A8A29E] italic'}`}>
                                        {isTracking ? 'Locked' : 'Off-Grid'}
                                    </p>
                                </div>
                                <div className="bg-[#FAF7F2]/40 p-3.5 rounded-2xl border border-[#E7E5E4]/50 group/stat">
                                    <div className="flex items-center gap-1.5 mb-1.5 text-[#A8A29E]">
                                        <ClipboardList className="w-3 h-3 group-hover/stat:text-[#B45309] transition-colors" />
                                        <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">Intelligence</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-[#2A2A2A] font-mono">{myHistory?.meetings?.length || 0}</p>
                                        <Link href="/dashboard/employee/history" className="bg-[#2A2A2A] text-white p-1 rounded-md hover:bg-black transition-colors">
                                            <History className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Compact Deployment Pulse */}
                    <div className="lg:col-span-5 bg-white rounded-[1.5rem] md:rounded-[2rem] border border-[#E7E5E4] p-4 md:p-6 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className={`p-3 rounded-2xl mb-4 transition-all duration-500 ${isTracking ? 'bg-emerald-50 text-emerald-600 scale-105 shadow-md shadow-emerald-500/5' : 'bg-[#FAF7F2] text-[#A8A29E]'}`}>
                            <Zap className={`w-6 h-6 ${isTracking ? 'animate-pulse' : ''}`} />
                        </div>
                        <h3 className="text-sm font-bold text-[#2A2A2A] font-serif mb-1 uppercase tracking-tight">Deployment Pulse</h3>
                        <p className="text-[8px] text-[#A8A29E] font-bold uppercase tracking-[0.1em] mb-5 leading-tight max-w-[180px]">Toggle telemetry broadcast to command center</p>
                        
                        <button
                            onClick={isTracking ? stopTracking : startTracking}
                            className={`w-full py-3 px-4 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 active:scale-[0.97] shadow-md ${
                                isTracking 
                                ? 'bg-white border-2 border-red-100 text-red-500 hover:bg-red-50' 
                                : 'bg-[#2A2A2A] text-white hover:bg-black'
                            }`}
                        >
                            <Power className="w-3.5 h-3.5" />
                            {isTracking ? 'Disconnect Link' : 'Initialize Tether'}
                        </button>

                        {isTracking && placeName && (
                            <div className="mt-4 flex items-start gap-2 bg-[#FAF7F2]/80 p-3 rounded-xl border border-[#E7E5E4]/80 w-full text-left animate-in fade-in slide-in-from-top-1 duration-300">
                                <MapPin className="w-3 h-3 text-[#B45309] shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-[7px] font-black text-[#B45309] uppercase tracking-widest mb-0.5">Location</p>
                                    <p className="text-[9px] font-bold text-[#57534E] leading-tight truncate">{placeName}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Lower Section: Intelligence Intake (Aligned with width) */}
                <div className="w-full">
                    <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-[#B45309]/20 p-4 md:p-8 shadow-md relative overflow-hidden bg-gradient-to-br from-white to-[#FAF7F2]">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 rounded-2xl bg-orange-50 text-[#B45309] border border-orange-100 shadow-sm shrink-0">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-[#2A2A2A] font-serif uppercase tracking-tight leading-none mb-1">Intelligence Intake</h3>
                                <p className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-widest">Log fresh interactions instantly</p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleLogMeeting} className="space-y-4 md:space-y-6 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.15em] ml-1">Subject of Interaction</label>
                                    <Input 
                                        placeholder="Entity Name" 
                                        className="h-12 rounded-2xl border-[#E7E5E4] bg-white text-sm font-bold font-serif px-5 shadow-sm focus:ring-2 focus:ring-[#B45309]/20"
                                        value={meetingWith}
                                        onChange={(e) => setMeetingWith(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.15em] ml-1">Strategic Brief</label>
                                    <Textarea 
                                        placeholder="Outcome and notes..." 
                                        className="min-h-[100px] rounded-[1.25rem] border-[#E7E5E4] bg-white text-sm leading-relaxed p-5 shadow-sm focus:ring-2 focus:ring-[#B45309]/20 resize-none h-[48px]"
                                        value={meetingDesc}
                                        onChange={(e) => setMeetingDesc(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            {(user?.employerId && typeof user.employerId === 'object' && 'role' in user.employerId && user.employerId.role === 'admin') && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-in fade-in slide-in-from-top-2 duration-500">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.15em] ml-1">Project Name</label>
                                        <Input 
                                            placeholder="Enter Project Name" 
                                            className="h-12 rounded-2xl border-[#E7E5E4] bg-white text-sm font-bold font-serif px-5 shadow-sm focus:ring-2 focus:ring-[#B45309]/20"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.15em] ml-1">Project Location</label>
                                        <Input 
                                            placeholder="Enter Project Location" 
                                            className="h-12 rounded-2xl border-[#E7E5E4] bg-white text-sm font-bold font-serif px-5 shadow-sm focus:ring-2 focus:ring-[#B45309]/20"
                                            value={projectLocationField}
                                            onChange={(e) => setProjectLocationField(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.15em] ml-1">Project Price</label>
                                        <Input 
                                            placeholder="Enter Project Price" 
                                            className="h-12 rounded-2xl border-[#E7E5E4] bg-white text-sm font-bold font-serif px-5 shadow-sm focus:ring-2 focus:ring-[#B45309]/20"
                                            value={projectPrice}
                                            onChange={(e) => setProjectPrice(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.15em] ml-1 flex items-center gap-1.5 shadow-sm">
                                    <Navigation className="w-3 h-3 text-[#B45309]" /> Report Location (Max 500m radius)
                                </label>
                                {isLoaded ? (
                                    <div className="h-[400px] rounded-[1.25rem] overflow-hidden border border-[#E7E5E4] relative shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]">
                                        {!mapCenter && (
                                            <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
                                                <div className="w-6 h-6 rounded-full border-2 border-[#B45309] border-t-transparent animate-spin mb-2" />
                                                <p className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-widest inline-flex items-center gap-1">Acquiring Lock<span className="w-1 h-1 bg-[#B45309] rounded-full animate-bounce delay-100" /><span className="w-1 h-1 bg-[#B45309] rounded-full animate-bounce delay-200" /><span className="w-1 h-1 bg-[#B45309] rounded-full animate-bounce delay-300" /></p>
                                            </div>
                                        )}
                                        
                                        <div className="absolute top-4 left-4 right-4 z-20">
                                            <Autocomplete
                                                onLoad={(ref) => autocompleteRef.current = ref}
                                                onPlaceChanged={onPlaceChanged}
                                                options={{
                                                    bounds: mapCenter ? {
                                                        north: mapCenter.lat + 0.005,
                                                        south: mapCenter.lat - 0.005,
                                                        east: mapCenter.lng + 0.005,
                                                        west: mapCenter.lng - 0.005,
                                                    } : undefined,
                                                    strictBounds: false
                                                }}
                                            >
                                                <div className="relative group/search">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E] group-focus-within/search:text-[#B45309] transition-colors" />
                                                    <input
                                                        type="text"
                                                        placeholder="Sectors, landmarks, or AOIs..."
                                                        value={pointingAddress}
                                                        onChange={(e) => setPointingAddress(e.target.value)}
                                                        className="w-full h-11 pl-11 pr-4 rounded-xl border-none bg-white/95 backdrop-blur-sm text-xs font-bold font-serif shadow-lg focus:ring-2 focus:ring-[#B45309]/20 transition-all outline-none"
                                                    />
                                                </div>
                                            </Autocomplete>
                                        </div>

                                        <GoogleMap
                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                            center={mapCenter || { lat: 20.5937, lng: 78.9629 }} // Default to India center if null
                                            zoom={mapCenter ? 16 : 4}
                                            onLoad={(map) => { meetingMapRef.current = map; }}
                                            onIdle={onMapIdle}
                                            options={{
                                              streetViewControl: false,
                                              mapTypeControl: false,
                                              fullscreenControl: false,
                                              zoomControl: true,
                                            }}
                                        >
                                            {mapCenter && (
                                                <Circle
                                                    center={mapCenter}
                                                    radius={500}
                                                    options={{
                                                        fillColor: '#B45309',
                                                        fillOpacity: 0.1,
                                                        strokeColor: '#B45309',
                                                        strokeOpacity: 0.4,
                                                        strokeWeight: 1,
                                                        clickable: false,
                                                    }}
                                                />
                                            )}
                                        </GoogleMap>
                                        
                                        {/* Static Center Marker */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mb-4 flex flex-col items-center">
                                            <div className={`transition-all duration-300 ${isLocationValid ? 'scale-110' : 'scale-90 opacity-50'}`}>
                                                <MapPin className={`w-8 h-8 ${isLocationValid ? 'text-[#B45309]' : 'text-red-500'} drop-shadow-md`} />
                                                <div className={`w-1 h-1 rounded-full mx-auto mt-[-4px] ${isLocationValid ? 'bg-[#B45309]' : 'bg-red-500'} shadow-sm`} />
                                            </div>
                                            {!isLocationValid && (
                                                <Badge variant="destructive" className="mt-2 text-[7px] font-black uppercase tracking-tighter px-1 h-3 animate-bounce">
                                                    Out of Range
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[400px] rounded-[1.25rem] border border-[#E7E5E4] bg-white flex flex-col items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)]">
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mb-2" />
                                        <p className="text-[10px] text-[#A8A29E] font-black uppercase tracking-[0.2em]">Loading Map Terminal...</p>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={submittingMeeting || !meetingWith || !meetingDesc || !pointedLocation || !isLocationValid}
                                className="w-full h-14 bg-[#2A2A2A] text-white rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-black/10 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
                            >
                                {submittingMeeting ? 'Transmitting...' : 'Log Operation'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @font-face {
                    font-family: 'DM Serif Display';
                    src: url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
                }
            `}</style>
        </div>
    );
}
