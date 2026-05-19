import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import ChatsScreen from '../screens/placeholder/ChatsScreen';
import MapScreen from '../screens/placeholder/MapScreen';
import ProfileScreen from '../screens/placeholder/ProfileScreen';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused, label }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={24}
        color={focused ? COLORS.primary : COLORS.textSecondary}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} label="Home" />,
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubbles" focused={focused} label="Chats" />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} label="Map" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} label="Profile" />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    ...SHADOWS.medium,
  },
  iconWrap: { alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.primary, fontWeight: '600' },
});
