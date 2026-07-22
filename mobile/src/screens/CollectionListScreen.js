import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import {
  addBook,
  addMovie,
  addSeries,
  addSong,
  getBooks,
  getMovies,
  getSeries,
  getSongs,
} from '../services/firebaseService';
import { pickAndConvertImageToDataUrl } from '../utils/imageUpload';
import {
  getSeriesDetail,
  searchBooks,
  searchMovies,
  searchSeries,
  searchSongs,
  tmdbPosterUrl,
} from '../services/catalogApi';

const CONFIG = {
  movies: {
    title: '영화',
    icon: 'film-outline',
    getItems: getMovies,
    addItem: addMovie,
    fields: [
      { name: 'title', label: '제목', required: true },
      { name: 'director', label: '감독' },
      { name: 'year', label: '개봉 연도' },
      { name: 'genre', label: '장르' },
      { name: 'userRating', label: '평점(0~5)' },
      { name: 'description', label: '설명', multiline: true },
    ],
    searchPlaceholder: '영화 제목 검색',
    searchItems: searchMovies,
    resultTitle: (item) => item.title || '제목 없음',
    resultSubtitle: (item) => [item.director, item.year, item.genre].filter(Boolean).join(' · '),
    resultImage: (item) => item.poster_path || '',
    mapExternalItem: (item) => ({
      title: item.title || '',
      director: item.director || '',
      actors: item.actors || '',
      image: item.poster_path || '',
      backdrop_path: item.backdrop_path || '',
      year: item.year || item.release_date || '',
      contentRating: item.rating || '',
      description: item.overview || '',
      genre: item.genre || '',
      nation: item.nation || '',
      runtime: item.runtime || '',
    }),
    subtitle: (item) => item.director || item.genre || '',
  },
  books: {
    title: '도서',
    icon: 'book-outline',
    getItems: getBooks,
    addItem: addBook,
    fields: [
      { name: 'title', label: '제목', required: true },
      { name: 'author', label: '저자', required: true },
      { name: 'publisher', label: '출판사' },
      { name: 'pubdate', label: '출판 연도' },
      { name: 'userRating', label: '평점(0~5)' },
      { name: 'description', label: '설명', multiline: true },
    ],
    searchPlaceholder: '도서 제목/저자 검색',
    searchItems: searchBooks,
    resultTitle: (item) => stripHtml(item.title) || '제목 없음',
    resultSubtitle: (item) => [stripHtml(item.author), stripHtml(item.publisher), item.pubdate].filter(Boolean).join(' · '),
    resultImage: (item) => item.image || '',
    mapExternalItem: (item) => ({
      title: stripHtml(item.title),
      author: stripHtml(item.author),
      publisher: stripHtml(item.publisher),
      image: item.image || '',
      link: item.link || '',
      pubdate: item.pubdate || '',
      discount: item.discount || '',
      description: stripHtml(item.description),
    }),
    subtitle: (item) => item.author || item.publisher || '',
  },
  music: {
    title: '음악',
    icon: 'musical-notes-outline',
    getItems: getSongs,
    addItem: addSong,
    fields: [
      { name: 'title', label: '제목', required: true },
      { name: 'artist', label: '아티스트', required: true },
      { name: 'album', label: '앨범' },
      { name: 'year', label: '발매 연도' },
      { name: 'userRating', label: '평점(0~5)' },
    ],
    searchPlaceholder: '곡명/아티스트 검색',
    searchItems: searchSongs,
    resultTitle: (item) => item.title || '제목 없음',
    resultSubtitle: (item) => [item.artist, item.album].filter(Boolean).join(' · '),
    resultImage: (item) => item.albumImg || item.image || '',
    mapExternalItem: (item) => ({
      title: item.title || '',
      artist: item.artist || '',
      album: item.album || '',
      image: item.albumImg || item.image || '',
      year: item.year || '',
      melonSongNo: item.songNo || '',
    }),
    subtitle: (item) => item.artist || item.album || '',
  },
  series: {
    title: '시리즈',
    icon: 'tv-outline',
    getItems: getSeries,
    addItem: addSeries,
    fields: [
      { name: 'title', label: '제목', required: true },
      { name: 'director', label: 'PD/제작자' },
      { name: 'year', label: '공개 연도' },
      { name: 'episodeCount', label: '에피소드 수' },
      { name: 'cast', label: '출연진' },
      { name: 'userRating', label: '평점(0~5)' },
      { name: 'overview', label: '줄거리', multiline: true },
    ],
    searchPlaceholder: '시리즈 제목 검색',
    searchItems: searchSeries,
    resultTitle: (item) => item.name || item.title || '제목 없음',
    resultSubtitle: (item) => [item.first_air_date?.slice?.(0, 4), item.overview].filter(Boolean).join(' · '),
    resultImage: (item) => tmdbPosterUrl(item.poster_path),
    mapExternalItem: async (item) => {
      const detail = item.id ? await getSeriesDetail(item.id) : {};
      const cast = detail.credits?.cast?.slice(0, 10).map((person) => person.name).join(', ') || '';
      const genres = detail.genres?.map((genre) => genre.name).join(', ') || '';
      const creators = detail.created_by?.map((creator) => creator.name).join(', ') || '';

      return {
        title: detail.name || item.name || '',
        image: tmdbPosterUrl(detail.poster_path || item.poster_path),
        director: creators,
        year: (detail.first_air_date || item.first_air_date || '').slice(0, 4),
        overview: detail.overview || item.overview || '',
        cast,
        genres,
        episodeCount: detail.number_of_episodes ? String(detail.number_of_episodes) : '',
        tmdbId: item.id || '',
      };
    },
    subtitle: (item) => item.director || item.cast || '',
  },
};

const stripHtml = (value) => String(value || '').replace(/<[^>]+>/g, '').trim();

const SECTION_META = {
  movies: { label: 'MOVIE VAULT', accent: colors.primary },
  series: { label: 'SERIES BOARD', accent: colors.blue },
  books: { label: 'BOOK SHELF', accent: colors.gold },
  music: { label: 'MIX ROOM', accent: colors.accent },
};

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'rated', label: '평점 있음' },
  { key: 'visual', label: '이미지 있음' },
];

const getRatingValue = (item) => {
  const rating = Number.parseFloat(item.userRating);
  return Number.isFinite(rating) ? rating : null;
};

const defaultForm = (fields) => {
  const payload = { image: '' };
  fields.forEach((f) => {
    payload[f.name] = '';
  });
  return payload;
};

export default function CollectionListScreen({ route, navigation }) {
  const { section, userId } = route.params;
  const config = CONFIG[section];

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState(defaultForm(config.fields));
  const [error, setError] = useState('');
  const [externalSearchText, setExternalSearchText] = useState('');
  const [externalResults, setExternalResults] = useState([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const meta = SECTION_META[section] || SECTION_META.movies;

  const loadItems = useCallback(async () => {
    try {
      setError('');
      const loaded = await config.getItems(userId);
      setItems(loaded);
    } catch (e) {
      setError(e.message || '로드 실패');
    }
  }, [config, userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      await loadItems();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadItems]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: `${config.title} 리스트`,
      headerRight: () => (
        <Pressable onPress={() => setOpenModal(true)} style={styles.headerButton}>
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      ),
    });
  }, [navigation, config.title]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const searched = keyword
      ? items.filter((item) => {
      const haystack = `${item.title || ''} ${config.subtitle(item) || ''}`.toLowerCase();
      return haystack.includes(keyword);
    })
      : items;

    if (filterMode === 'rated') return searched.filter((item) => getRatingValue(item) !== null);
    if (filterMode === 'visual') return searched.filter((item) => Boolean(item.image));
    return searched;
  }, [items, query, config, filterMode]);

  const stats = useMemo(() => {
    const rated = items.map(getRatingValue).filter((value) => value !== null);
    const average = rated.length
      ? (rated.reduce((sum, value) => sum + value, 0) / rated.length).toFixed(1)
      : '-';
    return {
      total: items.length,
      rated: rated.length,
      average,
    };
  }, [items]);

  const heroItem = useMemo(() => {
    return items.find((item) => item.image) || items[0] || null;
  }, [items]);

  const openDetail = (item) => {
    navigation.navigate('Detail', { section, userId, item });
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const closeModal = () => {
    setForm(defaultForm(config.fields));
    setExternalSearchText('');
    setExternalResults([]);
    setExternalError('');
    setOpenModal(false);
  };

  const runExternalSearch = async () => {
    const keyword = externalSearchText.trim();
    if (!keyword || !config.searchItems) return;

    try {
      setExternalLoading(true);
      setExternalError('');
      const results = await config.searchItems(keyword);
      setExternalResults(results);
      if (results.length === 0) setExternalError('검색 결과가 없습니다.');
    } catch (e) {
      setExternalResults([]);
      setExternalError(e.message || '검색 실패');
    } finally {
      setExternalLoading(false);
    }
  };

  const selectExternalResult = async (item) => {
    try {
      setExternalLoading(true);
      setExternalError('');
      const mapped = await config.mapExternalItem(item);
      setForm((prev) => ({ ...prev, ...mapped }));
    } catch (e) {
      setExternalError(e.message || '선택한 항목을 불러오지 못했습니다.');
    } finally {
      setExternalLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const dataUrl = await pickAndConvertImageToDataUrl();
      if (dataUrl) setField('image', dataUrl);
    } catch (e) {
      setError(e.message || '이미지 선택 실패');
    }
  };

  const saveItem = async () => {
    const required = config.fields.filter((f) => f.required);
    for (const field of required) {
      if (!String(form[field.name] || '').trim()) {
        setError(`${field.label}은(는) 필수입니다.`);
        return;
      }
    }

    const payload = { ...form };
    if (payload.userRating) payload.userRating = String(payload.userRating).trim();

    try {
      setError('');
      const saved = await config.addItem(payload, userId);
      setItems((prev) => [saved, ...prev]);
      setForm(defaultForm(config.fields));
      setExternalSearchText('');
      setExternalResults([]);
      setExternalError('');
      setOpenModal(false);
    } catch (e) {
      setError(e.message || '저장 실패');
    }
  };

  const renderItem = ({ item }) => {
    const ratingValue = getRatingValue(item);

    return (
    <Pressable style={styles.card} onPress={() => openDetail(item)}>
      <View style={[styles.imageWrap, { borderColor: meta.accent }]}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <Ionicons name={config.icon} size={24} color={meta.accent} />
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardMetaRow}>
          <View style={styles.typePill}>
            <Ionicons name={config.icon} size={12} color={meta.accent} />
            <Text style={[styles.typePillText, { color: meta.accent }]}>{config.title}</Text>
          </View>
          {ratingValue !== null ? (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={12} color={colors.gold} />
              <Text style={styles.ratingPillText}>{ratingValue.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.title || '제목 없음'}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{config.subtitle(item)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
    );
  };

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.topLine}>
        <Text style={styles.eyebrow}>FAV-THING</Text>
        <View style={[styles.sectionPill, { borderColor: meta.accent }]}>
          <Ionicons name={config.icon} size={13} color={meta.accent} />
          <Text style={[styles.sectionPillText, { color: meta.accent }]}>{meta.label}</Text>
        </View>
      </View>

      <Text style={styles.screenTitle}>{config.title} 컬렉션</Text>
      <Text style={styles.screenSubtitle}>
        {stats.total}개 저장됨 · 평점 {stats.rated}개 · 평균 {stats.average}
      </Text>

      {heroItem ? (
        <Pressable style={styles.spotlight} onPress={() => openDetail(heroItem)}>
          <View style={styles.spotlightCopy}>
            <Text style={styles.spotlightLabel}>RECENT PICK</Text>
            <Text style={styles.spotlightTitle} numberOfLines={2}>{heroItem.title || '제목 없음'}</Text>
            <Text style={styles.spotlightSub} numberOfLines={1}>{config.subtitle(heroItem) || '상세를 열어 메모와 평점을 남겨보세요'}</Text>
          </View>
          <View style={[styles.spotlightPoster, { borderColor: meta.accent }]}>
            {heroItem.image ? (
              <Image source={{ uri: heroItem.image }} style={styles.image} resizeMode="cover" />
            ) : (
              <Ionicons name={config.icon} size={28} color={meta.accent} />
            )}
          </View>
        </Pressable>
      ) : (
        <View style={styles.spotlightEmpty}>
          <Ionicons name={config.icon} size={24} color={meta.accent} />
          <Text style={styles.spotlightTitle}>첫 번째 {config.title}를 추가하세요</Text>
        </View>
      )}

      <View style={styles.searchShell}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="제목/부가정보 검색"
          placeholderTextColor={colors.subtle}
          style={styles.searchInput}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {FILTERS.map((filter) => {
          const active = filterMode === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => setFilterMode(filter.key)}
              style={[styles.filterChip, active && { backgroundColor: meta.accent, borderColor: meta.accent }]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.text} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.text} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="albums-outline" size={24} color={colors.muted} />
              <Text style={styles.empty}>아직 저장된 항목이 없습니다.</Text>
            </View>
          )
        }
      />

      <Modal visible={openModal} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{config.title} 추가</Text>
            <Pressable onPress={closeModal}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formBody}>
            <View style={styles.apiSearchBox}>
              <View style={styles.apiSearchHeader}>
                <View>
                  <Text style={styles.apiSearchLabel}>API SEARCH</Text>
                  <Text style={styles.apiSearchTitle}>검색해서 빠르게 채우기</Text>
                </View>
                <Ionicons name="sparkles-outline" size={20} color={meta.accent} />
              </View>
              <View style={styles.apiSearchRow}>
                <TextInput
                  value={externalSearchText}
                  onChangeText={setExternalSearchText}
                  placeholder={config.searchPlaceholder}
                  placeholderTextColor={colors.muted}
                  style={[styles.input, styles.apiSearchInput]}
                  returnKeyType="search"
                  onSubmitEditing={runExternalSearch}
                />
                <Pressable style={[styles.apiSearchButton, { backgroundColor: meta.accent }]} onPress={runExternalSearch} disabled={externalLoading}>
                  {externalLoading ? (
                    <ActivityIndicator color={colors.bg} size="small" />
                  ) : (
                    <Ionicons name="search" size={18} color={colors.bg} />
                  )}
                </Pressable>
              </View>

              {externalError ? <Text style={styles.inlineError}>{externalError}</Text> : null}

              {externalResults.slice(0, 6).map((result, index) => {
                const resultImage = config.resultImage(result);
                return (
                  <Pressable
                    key={`${config.resultTitle(result)}-${index}`}
                    style={styles.resultCard}
                    onPress={() => selectExternalResult(result)}
                  >
                    <View style={styles.resultImageWrap}>
                      {resultImage ? (
                        <Image source={{ uri: resultImage }} style={styles.resultImage} resizeMode="cover" />
                      ) : (
                        <Ionicons name={config.icon} size={20} color={colors.muted} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{config.resultTitle(result)}</Text>
                      <Text style={styles.resultSubtitle} numberOfLines={2}>{config.resultSubtitle(result)}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={meta.accent} />
                  </Pressable>
                );
              })}
            </View>

            {form.title ? (
              <View style={styles.formPreview}>
                <View style={[styles.resultImageWrap, { borderColor: meta.accent }]}>
                  {form.image ? (
                    <Image source={{ uri: form.image }} style={styles.resultImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name={config.icon} size={20} color={meta.accent} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{form.title}</Text>
                  <Text style={styles.resultSubtitle} numberOfLines={1}>
                    {form.artist || form.author || form.director || form.genre || '선택한 항목을 저장할 준비가 됐습니다'}
                  </Text>
                </View>
              </View>
            ) : null}

            <Pressable style={styles.imagePicker} onPress={pickImage}>
              <Ionicons name="image-outline" size={20} color={colors.muted} />
              <Text style={styles.imagePickerText}>{form.image ? '이미지 변경' : '이미지 선택'}</Text>
            </Pressable>
            {form.image ? <Image source={{ uri: form.image }} style={styles.previewImage} /> : null}

            {config.fields.map((field) => (
              <View key={field.name} style={{ marginBottom: 10 }}>
                <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
                <TextInput
                  value={String(form[field.name] || '')}
                  onChangeText={(text) => setField(field.name, text)}
                  placeholder={field.label}
                  placeholderTextColor={colors.muted}
                  multiline={Boolean(field.multiline)}
                  style={[styles.input, field.multiline && styles.textArea]}
                />
              </View>
            ))}
          </ScrollView>

          <Pressable style={[styles.saveButton, { backgroundColor: meta.accent }]} onPress={saveItem}>
            <Ionicons name="checkmark" size={18} color={colors.bg} />
            <Text style={styles.saveButtonText}>저장</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  headerButton: {
    marginRight: 4,
    backgroundColor: colors.surface2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 28,
    gap: 10,
  },
  listHeader: {
    gap: 12,
    marginBottom: 4,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
  },
  sectionPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  screenTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  screenSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: -8,
  },
  spotlight: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 146,
    flexDirection: 'row',
    padding: 12,
    overflow: 'hidden',
  },
  spotlightCopy: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  spotlightLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
  },
  spotlightTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  spotlightSub: {
    color: colors.muted,
    marginTop: 6,
    fontSize: 12,
  },
  spotlightPoster: {
    width: 90,
    height: 122,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightEmpty: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 118,
    padding: 14,
    justifyContent: 'center',
    gap: 10,
  },
  searchShell: {
    height: 48,
    backgroundColor: colors.input,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 10,
  },
  filterRail: {
    gap: 8,
    paddingBottom: 2,
  },
  filterChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipText: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: colors.bg,
  },
  error: { color: colors.danger, marginTop: 8, marginHorizontal: 16 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  empty: { textAlign: 'center', color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imageWrap: {
    width: 58,
    height: 78,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  cardBody: { flex: 1, minWidth: 0 },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: colors.surface2,
  },
  ratingPillText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: colors.muted, marginTop: 3, fontSize: 13 },
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  formBody: { padding: 16, paddingBottom: 6 },
  imagePicker: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  imagePickerText: { color: colors.muted },
  previewImage: { width: 110, height: 140, borderRadius: 8, marginBottom: 12 },
  label: { color: colors.muted, marginBottom: 6 },
  apiSearchBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface2,
    padding: 12,
    marginBottom: 12,
  },
  apiSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  apiSearchLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: '900',
  },
  apiSearchTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  apiSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  apiSearchInput: {
    flex: 1,
    marginTop: 0,
  },
  apiSearchButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineError: { color: colors.danger, marginTop: 8 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  resultImageWrap: {
    width: 42,
    height: 56,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultImage: { width: '100%', height: '100%' },
  resultTitle: { color: colors.text, fontWeight: '800' },
  resultSubtitle: { color: colors.muted, marginTop: 2, fontSize: 12, lineHeight: 16 },
  formPreview: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  saveButton: {
    margin: 16,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: { color: colors.bg, fontWeight: '900' },
});
