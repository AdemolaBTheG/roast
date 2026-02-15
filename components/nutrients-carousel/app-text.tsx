import { Text as RNText, type TextProps } from 'react-native';

export default function AppText({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ textAlign: 'left' }, style]} />;
}
