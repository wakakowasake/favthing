import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_IMAGE_DATA_URL_LENGTH = 850000;

const ensureMediaPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('이미지 접근 권한이 필요합니다.');
  }
};

export const pickAndConvertImageToDataUrl = async ({
  maxWidth = 800,
  maxHeight = 1200,
  compress = 0.8,
  maxDataUrlLength = MAX_IMAGE_DATA_URL_LENGTH,
} = {}) => {
  await ensureMediaPermission();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return '';
  }

  const source = result.assets[0];
  const width = source.width || maxWidth;
  const height = source.height || maxHeight;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);

  const targetWidth = Math.max(1, Math.round(width * ratio));
  const targetHeight = Math.max(1, Math.round(height * ratio));

  const manipulated = await manipulateAsync(
    source.uri,
    [{ resize: { width: targetWidth, height: targetHeight } }],
    {
      compress,
      format: SaveFormat.JPEG,
      base64: true,
    }
  );

  const dataUrl = `data:image/jpeg;base64,${manipulated.base64 || ''}`;
  if (dataUrl.length > maxDataUrlLength) {
    throw new Error('이미지가 너무 큽니다. 더 작은 이미지를 선택해주세요.');
  }

  return dataUrl;
};