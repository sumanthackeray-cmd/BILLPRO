/**
 * Supabase Authentication Adapter
 * Replaces Firebase Auth with Supabase Auth
 * Maintains backward compatibility with existing auth patterns
 */

import { supabase } from '../lib/supabase';

let currentUser = null;

// Initialize auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = {
      uid: session.user.id,
      email: session.user.email,
      metadata: session.user.user_metadata || {},
    };
  } else {
    currentUser = null;
  }
});

/**
 * Sign in with Google using Supabase
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Email sign in error:', error);
    throw error;
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email, password, userData = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Email sign up error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    currentUser = null;
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current user with fresh data
 */
export async function getCurrentUserAsync() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    if (user) {
      currentUser = {
        uid: user.id,
        email: user.email,
        metadata: user.user_metadata || {},
      };
      return currentUser;
    }
    return null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Reset password
 */
export async function resetPassword(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  } catch (error) {
    console.error('Update password error:', error);
    throw error;
  }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(metadata) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (error) throw error;
    
    if (data.user) {
      currentUser = {
        uid: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata || {},
      };
    }
    
    return data;
  } catch (error) {
    console.error('Update user metadata error:', error);
    throw error;
  }
}

/**
 * Get user's profile from users_profile table
 */
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(userId, profileData) {
  try {
    const { data, error } = await supabase
      .from('users_profile')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Upsert user profile error:', error);
    throw error;
  }
}

/**
 * Assign user to branch
 */
export async function assignUserToBranch(userId, branchId) {
  try {
    const { data, error } = await supabase
      .from('user_branch_assignments')
      .insert({
        user_id: userId,
        branch_id: branchId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Assign user to branch error:', error);
    throw error;
  }
}

/**
 * Get user's assigned branches
 */
export async function getUserAssignedBranches(userId) {
  try {
    const { data, error } = await supabase
      .from('user_branch_assignments')
      .select('branch_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map(item => item.branch_id);
  } catch (error) {
    console.error('Get user assigned branches error:', error);
    return [];
  }
}

// Initialize auth check on module load
export async function initializeAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    if (session?.user) {
      currentUser = {
        uid: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata || {},
      };
    }
  } catch (error) {
    console.error('Initialize auth error:', error);
  }
}
