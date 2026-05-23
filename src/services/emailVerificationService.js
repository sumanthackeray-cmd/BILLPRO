import { supabase } from '@/lib/supabase';
import { emailService } from './emailService';

/**
 * Email Verification Service
 * Handles user email verification and password reset flows
 * Integrates with Supabase Auth for secure token management
 */

export const emailVerificationService = {
  /**
   * Send verification email to newly registered user
   */
  async sendVerificationEmail(email, userId) {
    try {
      // Supabase automatically handles verification token generation
      const { error } = await supabase.auth.resendOtp({
        email,
        type: 'signup'
      });

      if (error) throw error;

      // Store verification status in database
      const { error: dbError } = await supabase
        .from('users')
        .update({
          email_verification_sent_at: new Date().toISOString(),
          email_verification_attempts: 1
        })
        .eq('id', userId);

      if (dbError) throw dbError;

      return {
        success: true,
        message: 'Verification email sent successfully',
        email
      };
    } catch (error) {
      console.error('[v0] Email verification error:', error);
      throw new Error(error.message || 'Failed to send verification email');
    }
  },

  /**
   * Verify email with OTP token
   */
  async verifyEmailWithToken(email, token) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) throw error;

      // Update user email_verified status
      if (data.user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email_verified: true,
            email_verified_at: new Date().toISOString()
          })
          .eq('id', data.user.id);

        if (updateError) throw updateError;
      }

      return {
        success: true,
        message: 'Email verified successfully',
        user: data.user
      };
    } catch (error) {
      console.error('[v0] Email verification failed:', error);
      throw new Error(error.message || 'Invalid or expired verification token');
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email) {
    try {
      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !userData) {
        // Don't reveal if email exists (security best practice)
        return {
          success: true,
          message: 'If an account exists with this email, you will receive a password reset link'
        };
      }

      // Request password reset from Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      // Log password reset request
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          company_id: userData.company_id,
          user_id: userData.id,
          action: 'password_reset_requested',
          resource: 'user_auth',
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent
        });

      if (logError) console.warn('Audit log warning:', logError);

      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      };
    } catch (error) {
      console.error('[v0] Password reset request error:', error);
      // Still return success message for security
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link'
      };
    }
  },

  /**
   * Verify and reset password with token
   */
  async resetPasswordWithToken(email, token, newPassword) {
    try {
      // Verify the token first
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery'
      });

      if (error) throw error;

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Log successful password reset
      const { error: logError } = await supabase
        .from('audit_logs')
        .insert({
          user_id: data.user.id,
          action: 'password_reset_completed',
          resource: 'user_auth',
          ip_address: await getClientIP(),
          user_agent: navigator.userAgent
        });

      if (logError) console.warn('Audit log warning:', logError);

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('[v0] Password reset error:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, email_verification_attempts')
        .eq('email', email.toLowerCase())
        .single();

      if (!userData) {
        return {
          success: true,
          message: 'Verification email sent'
        };
      }

      // Check attempt limits (max 5 attempts)
      if (userData.email_verification_attempts >= 5) {
        throw new Error('Too many verification attempts. Please try again later.');
      }

      // Resend OTP
      const { error } = await supabase.auth.resendOtp({
        email,
        type: 'signup'
      });

      if (error) throw error;

      // Increment attempts counter
      await supabase
        .from('users')
        .update({
          email_verification_attempts: (userData.email_verification_attempts || 0) + 1
        })
        .eq('id', userData.id);

      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      console.error('[v0] Resend verification error:', error);
      throw error;
    }
  }
};

/**
 * Get client IP address for audit logging
 */
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

export default emailVerificationService;
