/**
 * Auth Callback Page
 * Handles OAuth redirects from Supabase Auth
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getCurrentUserAsync, upsertUserProfile } from '../../api/supabase-auth';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          // Create or update user profile
          const user = session.user;
          await upsertUserProfile(user.id, {
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
            role: 'cashier', // Default role
            is_active: true,
          });

          // Redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          // No session, redirect to login
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <p className="text-muted-foreground">Please wait while we set up your account.</p>
      </div>
    </div>
  );
}
