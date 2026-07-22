import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildApiUrl } from '../config/api';
import { colors } from '../theme/colors';

const sections = ['movies', 'series', 'books', 'music'];

const makeFlat = (payload) => {
  const list = [];
  sections.forEach((section) => {
    (payload[section] || []).forEach((item) => {
      list.push({ ...item, section, key: `${section}-${item.id}` });
    });
  });
  return list;
};

export default function ShareReadOnlyScreen() {
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadShared = async () => {
    if (!userId.trim()) {
      setError('사용자 ID를 입력하세요.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await fetch(buildApiUrl(`/share/${encodeURIComponent(userId.trim())}`));
      if (!response.ok) throw new Error(`공유 조회 실패 (${response.status})`);
      const data = await response.json();
      setItems(makeFlat(data));
    } catch (e) {
      setError(e.message || '불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>SHARED COLLECTION</Text>
      <Text style={styles.title}>친구의 취향 보관함</Text>
      <View style={styles.searchPanel}>
        <View style={styles.inputShell}>
          <Ionicons name="person-outline" size={18} color={colors.muted} />
          <TextInput
            value={userId}
            onChangeText={setUserId}
            placeholder="공유 대상 userId"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <Pressable style={styles.button} onPress={loadShared}>
          <Ionicons name="search" size={18} color={colors.bg} />
          <Text style={styles.buttonText}>{loading ? '조회 중...' : '조회'}</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        style={{ marginTop: 12 }}
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.thumbWrap}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.thumb} />
              ) : (
                <Ionicons name="albums-outline" size={22} color={colors.muted} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardMeta}>{item.section}</Text>
              <Text style={styles.cardTitle}>{item.title || '제목 없음'}</Text>
              {item.userRating ? <Text style={styles.cardSub}>평점 {item.userRating}</Text> : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="share-social-outline" size={24} color={colors.muted} />
              <Text style={styles.cardSub}>조회할 공유 보관함을 입력하세요.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: '900', marginBottom: 6 },
  title: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 14 },
  searchPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
  },
  inputShell: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
  },
  button: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  buttonText: { color: colors.bg, fontWeight: '900' },
  error: { color: colors.danger, marginTop: 10 },
  card: {
    flexDirection: 'row',
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  thumbWrap: {
    width: 42,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: '100%', height: '100%' },
  cardMeta: { color: colors.primary, fontSize: 10, fontWeight: '900', marginBottom: 4 },
  cardTitle: { color: colors.text, fontWeight: '800' },
  cardSub: { color: colors.muted, marginTop: 2 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
});
