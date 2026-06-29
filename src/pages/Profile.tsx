import { User, MapPin, Phone, Mail, Edit, Plus, Package, Heart, Settings, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { pb } from '@/integrations/pocketbase/client';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [profileForm, setProfileForm] = useState({
    display_name: '',
    phone: ''
  });

  const [addressForm, setAddressForm] = useState({
    type: 'Home',
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    is_default: false
  });

type RecentOrder = {
  id: string;
  order_number: string;
  product_name: string;
  product_color: string | null;
  status: string;
  order_date: string;
};

const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadAddresses();
      loadRecentOrders();
    }
  }, [user]);

  const loadProfile = () => {
    // Profile fields (display_name, phone) live on the PocketBase users record,
    // which is already available from the auth store — no extra fetch needed.
    if (!user) return;
    setProfile(user);
    setProfileForm({
      display_name: (user.display_name as string) || '',
      phone: (user.phone as string) || '',
    });
  };

  const loadAddresses = async () => {
    try {
      const data = await pb.collection('addresses').getFullList({
        filter: pb.filter('user = {:uid}', { uid: user.id }),
        sort: '-is_default',
      });
      setAddresses(data);
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast({
        title: "Error",
        description: "Failed to load addresses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      const result = await pb.collection('orders').getList(1, 5, {
        filter: pb.filter('user = {:uid} || customer_email = {:email}', {
          uid: user.id,
          email: user.email,
        }),
        sort: '-order_date',
      });
      setRecentOrders(result.items as unknown as RecentOrder[]);
    } catch (error) {
      console.error('Error loading recent orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recent orders',
        variant: 'destructive',
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const updated = await pb.collection('users').update(user.id, profileForm);

      // Keep the auth store (and therefore useAuth().user) in sync so the new
      // display name/phone are reflected app-wide without a re-login.
      pb.authStore.save(pb.authStore.token, updated);

      setProfile(updated);
      setEditingProfile(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const saveAddress = async () => {
    try {
      if (editingAddress) {
        await pb.collection('addresses').update(editingAddress.id, addressForm);
      } else {
        await pb.collection('addresses').create({ ...addressForm, user: user.id });
      }

      await loadAddresses();
      setEditingAddress(null);
      setShowAddressForm(false);
      setAddressForm({
        type: 'Home',
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        is_default: false
      });
      toast({
        title: "Success",
        description: editingAddress ? "Address updated successfully" : "Address added successfully",
      });
    } catch (error) {
      console.error('Error saving address:', error);
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive",
      });
    }
  };

  const editAddress = (address) => {
    setAddressForm({
      type: address.type,
      name: address.name,
      address: address.address,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      phone: address.phone,
      is_default: address.is_default
    });
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">Loading your information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                  {!editingProfile ? (
                    <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={saveProfile}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                  {editingProfile ? (
                    <Input
                      value={profileForm.display_name}
                      onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-lg">{profile?.display_name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  {editingProfile ? (
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {profile?.phone || 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                  <p>{profile?.created ? new Date(profile.created).toLocaleDateString('en-IN') : 'Recently joined'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Addresses */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Delivery Addresses
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Address
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showAddressForm && (
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{editingAddress ? 'Edit Address' : 'Add New Address'}</h4>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddress(null);
                        setAddressForm({
                          type: 'Home',
                          name: '',
                          address: '',
                          city: '',
                          state: '',
                          pincode: '',
                          phone: '',
                          is_default: false
                        });
                      }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select value={addressForm.type} onValueChange={(value) => setAddressForm({ ...addressForm, type: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Home">Home</SelectItem>
                            <SelectItem value="Office">Office</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Address</Label>
                        <Input
                          value={addressForm.address}
                          onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                          placeholder="Street address"
                        />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Input
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <Label>Pincode</Label>
                        <Input
                          value={addressForm.pincode}
                          onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                          placeholder="Pincode"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                    <Button onClick={saveAddress} className="w-full">
                      {editingAddress ? 'Update Address' : 'Add Address'}
                    </Button>
                  </div>
                )}

                {addresses.map((address, index) => (
                  <div key={address.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={address.is_default ? "default" : "secondary"}>
                            {address.type}
                          </Badge>
                          {address.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="font-medium">{address.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {address.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}, {address.state} - {address.pincode}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3" />
                          {address.phone}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => editAddress(address)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    {index < addresses.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}

                {addresses.length === 0 && !showAddressForm && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No addresses added yet</p>
                    <p className="text-sm">Add your first address to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Orders */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/track-orders">
                    <Package className="h-4 w-4 mr-2" />
                    Track Orders
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/wishlist">
                    <Heart className="h-4 w-4 mr-2" />
                    My Wishlist
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/account-settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent orders</p>
                    <p className="text-sm">Your latest orders will appear here</p>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-3">
                      <p className="font-medium text-sm">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.product_name}{order.product_color ? ` - ${order.product_color}` : ''}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">
                          {order.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.order_date).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;