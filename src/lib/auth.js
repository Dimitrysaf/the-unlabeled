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
        metadata: user.user_metadata,
        appMetadata: user.app_metadata
    };
}

// Update user metadata (display name etc.)
export async function updateUserProfile(updates) {
    const { data, error } = await supabase.auth.updateUser({
        data: updates
    });
    if (error) throw error;
    return data;
}

/**
 * Update user fields such as email or password.
 * @param {object} updates        - e.g. { email } or { password }
 * @param {object} [options]      - e.g. { emailRedirectTo: 'https://…/auth/confirm' }
 */
export async function updateUser(updates, options = {}) {
    const { data, error } = await supabase.auth.updateUser(updates, options);
    if (error) throw error;
    return data;
}

// Reset password (for logged-out forgot-password flow)
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