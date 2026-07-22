import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { initializeFirebase, getAuthService } from '../lib/firebase';
import LoginScreen from '../screens/LoginScreen';
import CollectionListScreen from '../screens/CollectionListScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import ShareReadOnlyScreen from '../screens/ShareReadOnlyScreen';
import { shareText } from '../utils/share';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const sections = [
  { key: 'movies', label: '영화', icon: 'film-outline' },
  { key: 'series', label: '시리즈', icon: 'tv-outline' },
  { key: 'books', label: '도서', icon: 'book-outline' },
  { key: 'music', label: '음악', icon: 'musical-notes-outline' },
];

function SectionStack({ section, userId }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="Collection"
        component={CollectionListScreen}
        initialParams={{ section, userId }}
      />
      <Stack.Screen name="Detail" component={ItemDetailScreen} options={{ title: '상세' }} />
    </Stack.Navigator>
  );
}

function MainTabs({ userId }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const current = sections.find((s) => s.key === route.name);
        return {
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 66,
            paddingTop: 8,
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarIcon: ({ color, size }) => <Ionicons name={current?.icon || 'ellipse'} size={size} color={color} />,
        };
      }}
    >
      {sections.map((section) => (
        <Tab.Screen key={section.key} name={section.key} options={{ title: section.label }}>
          {() => <SectionStack section={section.key} userId={userId} />}
        </Tab.Screen>
      ))}

      <Tab.Screen
        name="share"
        component={ShareReadOnlyScreen}
        options={{
          title: '공유 조회',
          tabBarIcon: ({ color, size }) => <Ionicons name="share-social-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = useMemo(() => {
    initializeFirebase();
    return getAuthService();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="Main"
        options={{
          title: 'FAV-THING',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => shareText(`FAV-THING 공유 userId: ${user.uid}`)}
                style={styles.headerIconButton}
                accessibilityLabel="공유"
              >
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => signOut(auth)}
                style={styles.headerIconButton}
                accessibilityLabel="로그아웃"
              >
                <Ionicons name="log-out-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
          ),
        }}
      >
        {() => <MainTabs userId={user.uid} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
