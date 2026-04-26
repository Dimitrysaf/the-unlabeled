import { supabase } from './supabase.js';

/**
 * Authentication functions for Supabase
 */

// Sign up a new user
export async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata
        }
    });
    if (error) throw error;
    return data;
}

// Sign in with email and password
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

// Sign out
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

// Get current user
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

// Get current session
export async function getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

// Listen to auth state changes
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

// Get user profile data
export async function getUserProfile(userId = null) {
    const user = userId ? { id: userId } : await getCurrentUser();
    if (!user) return null;

    // In Supabase, auth.users data is accessible via the user object
    // For additional profile data, you might have a separate profiles table
    // But for auth.users fields, we can return what's available
    return {
        id: user.id,
        email: user.email,
        displayName: user.user_metadata?.display_name || user.user_metadata?.name || user.email,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastSignInAt: user.last_sign_in_at,
        emailConfirmedAt: user.email_confirmed_at,
        phone: user.phone,
        phoneConfirmedAt: user.phone_confirmed_at,
        // Additional metadata
        metadata: user.user_metadata,
        appMetadata: user.app_metadata
    };
}

// Update user metadata
export async function updateUserProfile(updates) {
    const { data, error } = await supabase.auth.updateUser({
        data: updates
    });
    if (error) throw error;
    return data;
}

// Update user fields such as email or password
export async function updateUser(updates) {
    const { data, error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    return data;
}

// Reset password
export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
}

// Confirm password reset
export async function confirmPasswordReset(token, newPassword) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });
    if (error) throw error;
}

// Note: To query auth.users table directly, you need service role key
// The functions above work with the current authenticated user
// For admin operations (listing all users), you'd need server-side code with service role