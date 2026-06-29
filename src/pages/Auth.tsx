import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { pb, type PBError } from '@/integrations/pocketbase/client';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const redirectIfAuthed = () => {
      if (pb.authStore.isValid) {
        const state = location.state as { from?: { pathname?: string } } | null;
        const from = state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    };

    // Redirect immediately if already signed in, and on any auth change
    // (e.g. right after a successful sign in / sign up).
    redirectIfAuthed();
    const unsubscribe = pb.authStore.onChange(() => redirectIfAuthed());

    return () => unsubscribe();
  }, [navigate, location.state]);

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    setError('');

    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
      });
      // No email verification required — sign the user in immediately.
      // The authStore.onChange listener handles the redirect.
      await pb.collection('users').authWithPassword(email, password);
    } catch (err) {
      const e = err as PBError;
      const emailError = e?.response?.data?.email?.message;
      if (emailError && /already|in use/i.test(emailError)) {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (e?.response?.data?.password) {
        setError('Password does not meet the requirements (minimum 6 characters).');
      } else {
        setError(e?.message || 'Could not create your account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    setError('');

    try {
      await pb.collection('users').authWithPassword(email, password);
      // Redirect handled by the authStore.onChange listener.
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const SignUpForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      handleSignUp(email, password);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Button>
      </form>
    );
  };

  const SignInForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSignIn(email, password);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signin-password">Password</Label>
          <Input
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <SignInForm />
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
