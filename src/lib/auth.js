// src/lib/auth.js
import { supabase } from './supabase.js';

/** @returns {Promise<User>} */
export async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
    });
    if (error) throw error;
    return data;
}

/** @returns {Promise<Session>} */
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

/** @returns {Promise<void>} */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

/** @returns {Promise<User|null>} */
export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}

/** @returns {Promise<Session|null>} */
export async function getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
}

/** Subscribes to auth state changes. Returns the unsubscribe handle. */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}

/** Returns a normalised profile object from the raw Supabase user. */
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
        appMetadata: user.app_metadata,
    };
}

/** Updates user_metadata fields (e.g. display_name). */
export async function updateUserProfile(updates) {
    const { data, error } = await supabase.auth.updateUser({ data: updates });
    if (error) throw error;
    return data;
}

/**
 * Updates user credentials (email or password).
 * @param {object} updates   e.g. { email } or { password }
 * @param {object} [options] e.g. { emailRedirectTo }
 */
export async function updateUser(updates, options = {}) {
    const { data, error } = await supabase.auth.updateUser(updates, options);
    if (error) throw error;
    return data;
}

/** Sends a password-reset email for logged-out users. */
export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
}

/** Sets a new password after the reset link has been followed. */
export async function confirmPasswordReset(_token, newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

/**
 * Permanently deletes the current user's account via the delete_user RPC.
 * The caller must re-authenticate (signIn) immediately before calling this.
 */
export async function deleteAccount() {
    const { error } = await supabase.rpc('delete_user');
    if (error) throw error;
}
