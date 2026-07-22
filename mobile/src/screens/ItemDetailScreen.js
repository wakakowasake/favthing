import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  deleteBook,
  deleteMovie,
  deleteSeries,
  deleteSong,
  updateBook,
  updateMovie,
  updateSeries,
  updateSong,
} from '../services/firebaseService';

const updaterMap = {
  books: { update: updateBook, remove: deleteBook },
  movies: { update: updateMovie, remove: deleteMovie },
  music: { update: updateSong, remove: deleteSong },
  series: { update: updateSeries, remove: deleteSeries },
};

const sectionLabel = {
  books: 'BOOK',
  movies: 'MOVIE',
  music: 'MUSIC',
  series: 'SERIES',
};

export default function ItemDetailScreen({ route, navigation }) {
  const { section, item } = route.params;
  const handlers = updaterMap[section];
  const [rating, setRating] = useState(item.userRating ? String(item.userRating) : '');
  const [comment, setComment] = useState(item.comment || '');
  const [saving, setSaving] = useState(false);

  const detailRows = useMemo(() => {
    const entries = Object.entries(item || {});
    return entries.filter(([k, v]) => !['id', 'userId', 'image', 'comment'].includes(k) && String(v || '').trim());
  }, [item]);

  const saveDetail = async () => {
    try {
      setSaving(true);
      await handlers.update(item.id, {
        userRating: rating.trim(),
        comment: comment.trim(),
      });
      Alert.alert('완료', '수정이 저장되었습니다.');
    } catch (e) {
      Alert.alert('오류', e.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const removeItem = () => {
    Alert.alert('삭제 확인', '정말 삭제하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await handlers.remove(item.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('오류', e.message || '삭제 실패');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.hero}>
        <View style={styles.posterFrame}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <Ionicons name="albums-outline" size={34} color={colors.muted} />
          )}
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{sectionLabel[section] || 'ITEM'}</Text>
          <Text style={styles.title} numberOfLines={3}>{item.title || '제목 없음'}</Text>
          {rating ? (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color={colors.gold} />
              <Text style={styles.ratingBadgeText}>{rating}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionBox}>
        {detailRows.map(([key, value]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{key}</Text>
            <Text style={styles.value}>{String(value)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionBox}>
        <Text style={styles.label}>평점(0~5)</Text>
        <TextInput
          value={rating}
          onChangeText={setRating}
          keyboardType="decimal-pad"
          placeholder="예: 4.5"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>코멘트</Text>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="메모를 입력하세요"
          placeholderTextColor={colors.muted}
          multiline
          style={[styles.input, styles.textArea]}
        />

        <Pressable style={[styles.button, saving && { opacity: 0.6 }]} onPress={saveDetail} disabled={saving}>
          <Ionicons name="checkmark" size={18} color={colors.bg} />
          <Text style={styles.buttonText}>{saving ? '저장 중...' : '수정 저장'}</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={removeItem}>
          <Ionicons name="trash-outline" size={18} color={colors.text} />
          <Text style={styles.deleteButtonText}>삭제</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  posterFrame: {
    width: 124,
    height: 172,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  heroCopy: {
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  kicker: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', lineHeight: 31 },
  ratingBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  ratingBadgeText: { color: colors.text, fontWeight: '900' },
  sectionBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  row: { marginBottom: 8 },
  label: { color: colors.muted, fontSize: 12, textTransform: 'uppercase' },
  value: { color: colors.text, marginTop: 2 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    marginTop: 14,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    marginTop: 10,
    backgroundColor: colors.primaryDark,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: { color: colors.bg, fontWeight: '900' },
  deleteButtonText: { color: colors.text, fontWeight: '800' },
});
