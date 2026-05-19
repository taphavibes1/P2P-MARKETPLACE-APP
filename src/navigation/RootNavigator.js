import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import UploadIdScreen from '../screens/auth/UploadIdScreen';
import ListingDetailScreen from '../screens/home/ListingDetailScreen';
import CreateListingScreen from '../screens/listings/CreateListingScreen';
import LoadingScreen from '../components/common/LoadingScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen message="Loading Ugbowo Market..." />;

  if (!user) {
    return <AuthNavigator />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="UploadId" component={UploadIdScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
    </Stack.Navigator>
  );
}
