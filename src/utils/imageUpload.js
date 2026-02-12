const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_IMAGE_DATA_URL_LENGTH = 850000; // keep far below Firestore 1MiB doc limit

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 처리하지 못했습니다.'));
    img.src = src;
  });

export const convertImageFileToDataUrl = async (
  file,
  {
    maxWidth = 800,
    maxHeight = 1200,
    quality = 0.85,
    maxDataUrlLength = MAX_IMAGE_DATA_URL_LENGTH,
  } = {}
) => {
  if (!file) {
    throw new Error('이미지 파일이 선택되지 않았습니다.');
  }

  if (!file.type?.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error('이미지는 8MB 이하 파일만 업로드할 수 있습니다.');
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);

  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('브라우저에서 이미지 변환을 지원하지 않습니다.');
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (dataUrl.length > maxDataUrlLength) {
    throw new Error('이미지가 너무 큽니다. 더 작은 이미지를 선택해주세요.');
  }

  return dataUrl;
};

