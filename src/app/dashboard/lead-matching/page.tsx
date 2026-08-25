'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { profileApi } from '@/lib/api';
import {
  Camera,
  X,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamically import the existing pages to avoid SSR issues
const ChatPage = dynamic(() => import('../chat/page'), { ssr: false });
const GroupChatPage = dynamic(() => import('../group-chat/page'), { ssr: false });
const LeadsTab = dynamic(() => import('../group-chat/LeadsTab'), { ssr: false });
const StatsTab = dynamic(() => import('../group-chat/StatsTab'), { ssr: false });

type HubTab = 'chats' | 'groups' | 'leads';

export default function LeadMatchingHubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    }>
      <LeadMatchingHubContent />
    </Suspense>
  );
}

function LeadMatchingHubContent() {
  const { user, checkAuth, status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<HubTab>('groups');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Read tab from URL params on mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'chats' || tab === 'groups' || tab === 'leads') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Hide the layout's mobile header and sidebar on this page
  useEffect(() => {
    const layoutHeader = document.querySelector('header.lg\\:hidden') as HTMLElement | null;
    if (layoutHeader) layoutHeader.style.display = 'none';
    // Also hide the sidebar on mobile for a full-screen experience
    const sidebar = document.querySelector('aside') as HTMLElement | null;
    if (sidebar) sidebar.style.display = 'none';
    // Remove padding-top from main content
    const main = document.querySelector('main') as HTMLElement | null;
    if (main) {
      main.style.paddingTop = '0';
      main.style.marginLeft = '0';
    }
    return () => {
      if (layoutHeader) layoutHeader.style.display = '';
      if (sidebar) sidebar.style.display = '';
      if (main) {
        main.style.paddingTop = '';
        main.style.marginLeft = '';
      }
    };
  }, []);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading' || !user) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#FAF7F2] overflow-hidden">

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chats' && (
          <div className="absolute inset-0 overflow-hidden flex flex-col [&>*]:!h-full [&>*]:!mt-0 [&>*]:!max-h-full [&>*]:!min-h-0 [&>*>*]:!h-full [&>*>*]:!mt-0 [&>*>*]:!max-h-full">
            <ChatPage />
          </div>
        )}
        {activeTab === 'groups' && (
          <div className="absolute inset-0 overflow-hidden flex flex-col [&>*]:!h-full [&>*]:!mt-0 [&>*]:!max-h-full [&>*]:!min-h-0 [&>*>*]:!h-full [&>*>*]:!mt-0 [&>*>*]:!max-h-full">
            <GroupChatPage />
          </div>
        )}
        {activeTab === 'leads' && isAdmin && (
          <div className="absolute inset-0 overflow-y-auto bg-white">
            <div className="max-w-4xl mx-auto p-4 space-y-6">
              {/* Stats Section */}
              <div className="bg-gradient-to-br from-[#1C1917] to-[#292524] rounded-2xl p-5 shadow-lg">
                <h2 className="text-sm font-bold text-[#B45309] uppercase tracking-wider mb-3">Lead Intelligence</h2>
                <StatsTab />
              </div>
              {/* Leads List */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E7E5E4] bg-[#FAF7F2]">
                  <h2 className="text-sm font-bold text-[#1C1917] font-serif">All Extracted Leads</h2>
                  <p className="text-[10px] text-[#57534E] mt-0.5">Leads detected from group chats via NLP</p>
                </div>
                <LeadsTab />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Picture Modal */}
      {showProfileModal && (
        <ProfilePictureModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdated={() => {
            checkAuth();
            setShowProfileModal(false);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROFILE PICTURE MODAL
// ═══════════════════════════════════════════════════════════

function ProfilePictureModal({
  user,
  onClose,
  onUpdated,
}: {
  user: { name: string; profilePictureUrl?: string; role: string };
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await profileApi.uploadProfilePicture(selectedFile);
      toast.success('Profile picture updated!');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    try {
      await profileApi.update({ profilePictureUrl: '' });
      toast.success('Profile picture removed');
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E7E5E4]">
          <h3 className="text-base font-bold text-[#1C1917] font-serif">Profile Picture</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#FAF7F2] transition-colors"
          >
            <X className="w-4 h-4 text-[#57534E]" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex flex-col items-center py-8 px-4">
          <div className="relative">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-[#B45309]/20 shadow-lg"
              />
            ) : user.profilePictureUrl ? (
              <img
                src={user.profilePictureUrl}
                alt={user.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-[#B45309]/20 shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#B45309] to-[#92400E] flex items-center justify-center text-white font-bold text-4xl border-4 border-[#B45309]/20 shadow-lg">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}

            {/* Camera button overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-10 h-10 bg-[#B45309] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#92400E] transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-4 text-sm font-bold text-[#1C1917] font-serif">{user.name}</p>
          <p className="text-xs text-[#57534E] capitalize">{user.role}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t border-[#E7E5E4] bg-[#FAF7F2]">
          {user.profilePictureUrl && !preview && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="flex-1 py-2.5 px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
          {preview && (
            <>
              <button
                onClick={() => { setPreview(null); setSelectedFile(null); }}
                disabled={uploading}
                className="flex-1 py-2.5 px-4 bg-white text-[#57534E] border border-[#E7E5E4] rounded-xl text-xs font-bold hover:bg-[#FAF7F2] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 py-2.5 px-4 bg-[#B45309] text-white rounded-xl text-xs font-bold hover:bg-[#92400E] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </>
                )}
              </button>
            </>
          )}
          {!preview && !user.profilePictureUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-4 bg-[#B45309] text-white rounded-xl text-xs font-bold hover:bg-[#92400E] transition-colors flex items-center justify-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              Upload Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
