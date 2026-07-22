import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { GoogleAuthProvider, signInAnonymously, signInWithCredential } from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { getAuthService } from '../lib/firebase';
import { colors } from '../theme/colors';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_FALLBACK = 'google-oauth-client-id-not-configured.apps.googleusercontent.com';

const previewTiles = [
  { label: 'MOVIE', title: 'Neo noir', icon: 'film-outline', tone: colors.primary },
  { label: 'BOOK', title: 'Shelf', icon: 'book-outline', tone: colors.gold },
  { label: 'MUSIC', title: 'Loop', icon: 'musical-notes-outline', tone: colors.accent },
  { label: 'SERIES', title: 'Watchlist', icon: 'tv-outline', tone: colors.blue },
];

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleClientIds = useMemo(() => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || webClientId;
    const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || webClientId;
    const fallbackClientId = webClientId || iosClientId || androidClientId || GOOGLE_CLIENT_ID_FALLBACK;

    return {
      enabled: Boolean(webClientId || iosClientId || androidClientId),
      webClientId: webClientId || fallbackClientId,
      iosClientId: iosClientId || fallbackClientId,
      androidClientId: androidClientId || fallbackClientId,
      clientId: fallbackClientId,
    };
  }, []);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientIds.clientId,
    webClientId: googleClientIds.webClientId,
    iosClientId: googleClientIds.iosClientId,
    androidClientId: googleClientIds.androidClientId,
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;

    const signInWithGoogleToken = async () => {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      const accessToken = response.params?.access_token || response.authentication?.accessToken;

      if (!idToken && !accessToken) {
        setError('Google 인증 토큰을 받지 못했습니다.');
        setLoading(false);
        return;
      }

      try {
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(getAuthService(), credential);
      } catch (e) {
        setError(e.message || 'Google 로그인에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    signInWithGoogleToken();
  }, [response]);

  const handleGoogleSignIn = async () => {
    if (!googleClientIds.enabled) {
      setError('Google OAuth 클라이언트 ID가 아직 설정되지 않았습니다.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await promptAsync();
      if (result.type !== 'success') {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
      setError(e.message || 'Google 로그인을 시작하지 못했습니다.');
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInAnonymously(getAuthService());
    } catch (e) {
      setError(e.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewGrid}>
        {previewTiles.map((tile, index) => (
          <View
            key={tile.label}
            style={[
              styles.previewTile,
              index % 2 === 1 && styles.previewTileLow,
              { borderColor: tile.tone },
            ]}
          >
            <Ionicons name={tile.icon} size={22} color={tile.tone} />
            <Text style={styles.previewLabel}>{tile.label}</Text>
            <Text style={styles.previewTitle} numberOfLines={1}>{tile.title}</Text>
          </View>
        ))}
      </View>

      <View style={styles.brandRow}>
        <Text style={styles.brand}>FAV-THING</Text>
        <Text style={styles.kicker}>PRIVATE LIBRARY</Text>
      </View>
      <Text style={styles.title}>취향을 저장하는 가장 빠른 방법</Text>
      <Text style={styles.subtitle}>영화, 도서, 음악, 시리즈를 검색하고 내 컬렉션으로 바로 담으세요.</Text>

      <View style={styles.statRow}>
        <View style={styles.statPill}>
          <Text style={styles.statNumber}>4</Text>
          <Text style={styles.statLabel}>collections</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statNumber}>API</Text>
          <Text style={styles.statLabel}>search ready</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        disabled={loading || !request}
        onPress={handleGoogleSignIn}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={styles.buttonText}>Google로 시작하기</Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[styles.secondaryButton, loading && styles.buttonDisabled]}
        disabled={loading}
        onPress={handleAnonymousSignIn}
      >
        <Ionicons name="person-circle-outline" size={19} color={colors.text} />
        <Text style={styles.secondaryButtonText}>익명으로 둘러보기</Text>
      </Pressable>

      <Text style={styles.caption}>
        {googleClientIds.enabled ? 'Google 로그인 사용 가능' : 'Google OAuth ID 설정 전에는 익명 로그인을 사용하세요.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  previewTile: {
    flex: 1,
    height: 124,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: 10,
    justifyContent: 'space-between',
  },
  previewTileLow: {
    marginTop: 22,
  },
  previewLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  previewTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  brand: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statPill: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  statNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.subtle,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  caption: {
    color: colors.muted,
    marginTop: 12,
    fontSize: 12,
  },
});
