import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Pin = {
  id: string;
  username: string;
  lat: number;
  lng: number;
  description: string;
  images: string[];
  pin_color?: string;
  storage_paths?: string[];
  is_authenticated?: boolean;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
};

export type Like = {
  id: string;
  username: string;
  pin_id: string;
  image_index: number;
  created_at: string;
};

export type Comment = {
  id: string;
  username: string;
  pin_id: string;
  text: string;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  role: 'user' | 'admin';
  contact_info?: string;
  about_me?: string;
  profile_picture_url?: string;
  banner_url?: string;
  created_at: string;
  updated_at: string;
};

export const getCurrentUserProfile = async (): Promise<Profile | null> => {
  try {
    console.log('🔍 Checking for authenticated user...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return null;
    }

    console.log('✅ User authenticated, fetching profile for:', user.id);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching user profile:', error);
      return null;
    }

    if (!profile) {
      console.log('❌ No profile found for user:', user.id);
      return null;
    }

    console.log('✅ Profile fetched successfully:', profile);
    return profile;
  } catch (err) {
    console.error('💥 Unexpected error in getCurrentUserProfile:', err);
    return null;
  }
};

export const getProfileByUsername = async (username: string): Promise<Profile | null> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  return profile;
};

export const updateUserProfile = async (userId: string, profileData: Partial<Profile>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('Error updating profile:', err);
    return false;
  }
};

export const getUserPins = async (username: string): Promise<Pin[]> => {
  const { data: pins } = await supabase
    .from('pins')
    .select('*')
    .eq('username', username)
    .order('created_at', { ascending: false });

  return pins || [];
};

// Tribe colors mapping
export const TRIBE_COLORS = {
  'Reuben': '#FF6B6B',     // Red
  'Simeon': '#4ECDC4',     // Teal
  'Levi': '#45B7D1',       // Blue
  'Judah': '#96CEB4',      // Green
  'Dan': '#FFEAA7',        // Yellow
  'Naphtali': '#DDA0DD',   // Plum
  'Gad': '#98D8C8',        // Mint
  'Asher': '#F7DC6F',      // Gold
  'Issachar': '#BB8FCE',   // Lavender
  'Zebulun': '#85C1E9',    // Sky Blue
  'Joseph': '#F8C471',     // Orange
  'Benjamin': '#82E0AA'    // Light Green
} as const;

export type TribeName = keyof typeof TRIBE_COLORS;

// Upload image to Supabase Storage
export const uploadImage = async (file: File, userId: string): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('pin-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    return data.path;
  } catch (err) {
    console.error('Failed to upload image:', err);
    return null;
  }
};

// Get public URL for uploaded image
export const getImageUrl = (path: string): string => {
  const { data } = supabase.storage
    .from('pin-images')
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Delete image from storage
export const deleteImage = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('pin-images')
      .remove([path]);

    return !error;
  } catch (err) {
    console.error('Failed to delete image:', err);
    return false;
  }
};