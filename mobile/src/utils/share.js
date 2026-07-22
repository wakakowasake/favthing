import { Share } from 'react-native';

export const shareText = async (message) => {
  if (!message) return;
  await Share.share({ message });
};