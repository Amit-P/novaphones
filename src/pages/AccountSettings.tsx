import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pb, type PBError } from '@/integrations/pocketbase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Bell, Globe, Lock, Download, Trash2, Monitor, Smartphone, Chrome, Settings, Eye, EyeOff, FileSpreadsheet } from 'lucide-react';
import { z } from 'zod';
import * as XLSX from 'xlsx';

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Preferences
  const [preferences, setPreferences] = useState({
    email_order_updates: true,
    email_promotions: true,
    email_newsletter: false,
    theme: 'system',
    language: 'en',
    region: 'IN',
  });

  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    marketing_consent: false,
    data_sharing: false,
    analytics_consent: true,
  });

  // Password change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  // PocketBase record ids for the user's settings rows (needed to update them)
  const [preferencesId, setPreferencesId] = useState<string | null>(null);
  const [privacyId, setPrivacyId] = useState<string | null>(null);

  // Current device (replaces the old DB-backed sessions list, which was never
  // populated). PocketBase doesn't expose per-device sessions, so we show the
  // browser the user is signed in from right now.
  const currentDevice = (() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
    return { isMobile, label: ua || 'Current device' };
  })();

  useEffect(() => {
    if (user) {
      loadPreferences();
      loadPrivacySettings();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      let record;
      try {
        record = await pb
          .collection('user_preferences')
          .getFirstListItem(pb.filter('user = {:uid}', { uid: user.id }));
      } catch (err) {
        if ((err as PBError)?.status === 404) {
          // No preferences row yet — create one with the app's expected defaults
          // (PocketBase fields don't carry these defaults themselves).
          record = await pb.collection('user_preferences').create({
            user: user.id,
            email_order_updates: true,
            email_promotions: true,
            email_newsletter: false,
            theme: 'system',
            language: 'en',
            region: 'IN',
          });
        } else {
          throw err;
        }
      }

      setPreferencesId(record.id);
      setPreferences({
        email_order_updates: record.email_order_updates,
        email_promotions: record.email_promotions,
        email_newsletter: record.email_newsletter,
        theme: record.theme,
        language: record.language,
        region: record.region,
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrivacySettings = async () => {
    try {
      let record;
      try {
        record = await pb
          .collection('user_privacy_settings')
          .getFirstListItem(pb.filter('user = {:uid}', { uid: user.id }));
      } catch (err) {
        if ((err as PBError)?.status === 404) {
          record = await pb.collection('user_privacy_settings').create({
            user: user.id,
            marketing_consent: false,
            data_sharing: false,
            analytics_consent: true,
          });
        } else {
          throw err;
        }
      }

      setPrivacyId(record.id);
      setPrivacySettings({
        marketing_consent: record.marketing_consent,
        data_sharing: record.data_sharing,
        analytics_consent: record.analytics_consent,
      });
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const savePreferences = async () => {
    try {
      if (!preferencesId) return;
      await pb.collection('user_preferences').update(preferencesId, preferences);

      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  const savePrivacySettings = async () => {
    try {
      if (!privacyId) return;
      await pb.collection('user_privacy_settings').update(privacyId, privacySettings);

      toast({
        title: "Success",
        description: "Privacy settings updated successfully",
      });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive",
      });
    }
  };

  const changePassword = async () => {
    try {
      // Validate password form
      const result = passwordSchema.safeParse(passwordForm);
      if (!result.success) {
        const errors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setPasswordErrors(errors);
        return;
      }

      setPasswordErrors({});

      // PocketBase requires the current password to change it, and rotates the
      // auth token on success — so we re-authenticate to keep the session alive.
      await pb.collection('users').update(user.id, {
        oldPassword: passwordForm.currentPassword,
        password: passwordForm.newPassword,
        passwordConfirm: passwordForm.confirmPassword,
      });
      await pb.collection('users').authWithPassword(
        user.email as string,
        passwordForm.newPassword
      );

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    } catch (error) {
      const e = error as PBError;
      const msg = e?.response?.data?.oldPassword
        ? 'Your current password is incorrect.'
        : e?.message || 'Failed to change password';
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const downloadUserData = async (format: 'json' | 'excel' = 'json') => {
    try {
      // Fetch all user data
      const userFilter = pb.filter('user = {:uid}', { uid: user.id });
      const [addressesData, ordersData, preferencesData, privacyData] = await Promise.all([
        pb.collection('addresses').getFullList({ filter: userFilter }),
        pb.collection('orders').getFullList({ filter: userFilter }),
        pb.collection('user_preferences').getFirstListItem(userFilter).catch(() => null),
        pb.collection('user_privacy_settings').getFirstListItem(userFilter).catch(() => null),
      ]);

      const userData = {
        // Profile now lives on the users record itself.
        profile: {
          id: user.id,
          email: user.email,
          display_name: user.display_name ?? null,
          phone: user.phone ?? null,
          created: user.created,
        },
        addresses: addressesData,
        orders: ordersData,
        preferences: preferencesData,
        privacy: privacyData,
        exported_at: new Date().toISOString(),
      };

      if (format === 'excel') {
        // Create Excel workbook
        const wb = XLSX.utils.book_new();
        
        // Add Profile sheet
        if (userData.profile) {
          const profileWs = XLSX.utils.json_to_sheet([userData.profile]);
          XLSX.utils.book_append_sheet(wb, profileWs, 'Profile');
        }
        
        // Add Addresses sheet
        if (userData.addresses && userData.addresses.length > 0) {
          const addressesWs = XLSX.utils.json_to_sheet(userData.addresses);
          XLSX.utils.book_append_sheet(wb, addressesWs, 'Addresses');
        }
        
        // Add Orders sheet
        if (userData.orders && userData.orders.length > 0) {
          const ordersWs = XLSX.utils.json_to_sheet(userData.orders);
          XLSX.utils.book_append_sheet(wb, ordersWs, 'Orders');
        }
        
        // Add Preferences sheet
        if (userData.preferences) {
          const preferencesWs = XLSX.utils.json_to_sheet([userData.preferences]);
          XLSX.utils.book_append_sheet(wb, preferencesWs, 'Preferences');
        }
        
        // Add Privacy Settings sheet
        if (userData.privacy) {
          const privacyWs = XLSX.utils.json_to_sheet([userData.privacy]);
          XLSX.utils.book_append_sheet(wb, privacyWs, 'Privacy Settings');
        }
        
        // Write the file
        XLSX.writeFile(wb, `user-data-${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: `Your data has been downloaded as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error downloading data:', error);
      toast({
        title: "Error",
        description: "Failed to download your data",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async () => {
    try {
      // Note: This requires a server-side edge function for complete account deletion
      // For now, we'll sign the user out and show a message
      await signOut();
      toast({
        title: "Account Deletion Requested",
        description: "Please contact support to complete account deletion",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process account deletion",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Account Settings
          </h1>
          <p className="text-muted-foreground">Manage your account security and preferences</p>
        </div>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Privacy
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Change Password */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <Label>Current Password</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-destructive mt-1">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                <div>
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-destructive mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
                <Button onClick={changePassword}>Change Password</Button>
              </div>
            </div>

            <Separator />

            {/* Two-Factor Authentication */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add an extra layer of security to your account
              </p>
              <Button variant="outline" disabled>
                <Lock className="h-4 w-4 mr-2" />
                Enable 2FA (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>The device you're currently signed in from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {currentDevice.isMobile ? (
                <Smartphone className="h-5 w-5" />
              ) : (
                <Chrome className="h-5 w-5" />
              )}
              <div>
                <p className="font-medium break-all">{currentDevice.label}</p>
                <p className="text-sm text-muted-foreground">This device — signed in now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what updates you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Order Updates</Label>
                <p className="text-sm text-muted-foreground">Get notified about your order status</p>
              </div>
              <Switch
                checked={preferences.email_order_updates}
                onCheckedChange={(checked) => setPreferences({ ...preferences, email_order_updates: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Promotions & Offers</Label>
                <p className="text-sm text-muted-foreground">Receive promotional emails and special offers</p>
              </div>
              <Switch
                checked={preferences.email_promotions}
                onCheckedChange={(checked) => setPreferences({ ...preferences, email_promotions: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Newsletter</Label>
                <p className="text-sm text-muted-foreground">Get our weekly newsletter</p>
              </div>
              <Switch
                checked={preferences.email_newsletter}
                onCheckedChange={(checked) => setPreferences({ ...preferences, email_newsletter: checked })}
              />
            </div>
            <Button onClick={savePreferences}>Save Preferences</Button>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              App Preferences
            </CardTitle>
            <CardDescription>Customize your app experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theme</Label>
              <Select value={preferences.theme} onValueChange={(value) => setPreferences({ ...preferences, theme: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Language</Label>
              <Select value={preferences.language} onValueChange={(value) => setPreferences({ ...preferences, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                  <SelectItem value="es">Español (Spanish)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Region</Label>
              <Select value={preferences.region} onValueChange={(value) => setPreferences({ ...preferences, region: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={savePreferences}>Save Preferences</Button>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Privacy & Data
            </CardTitle>
            <CardDescription>Control your data and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Marketing Consent</Label>
                <p className="text-sm text-muted-foreground">Allow us to send you marketing communications</p>
              </div>
              <Switch
                checked={privacySettings.marketing_consent}
                onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, marketing_consent: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Share data with partners for better experience</p>
              </div>
              <Switch
                checked={privacySettings.data_sharing}
                onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, data_sharing: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Analytics</Label>
                <p className="text-sm text-muted-foreground">Help us improve by sharing usage data</p>
              </div>
              <Switch
                checked={privacySettings.analytics_consent}
                onCheckedChange={(checked) => setPrivacySettings({ ...privacySettings, analytics_consent: checked })}
              />
            </div>
            <div className="pt-4">
              <Button onClick={savePrivacySettings}>Save Privacy Settings</Button>
            </div>
            <Separator />
            <div className="space-y-3 pt-4">
              <Button variant="outline" onClick={() => downloadUserData('json')} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download My Data (JSON)
              </Button>
              <Button variant="outline" onClick={() => downloadUserData('excel')} className="w-full">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Download My Data (Excel)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-destructive-foreground">
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;