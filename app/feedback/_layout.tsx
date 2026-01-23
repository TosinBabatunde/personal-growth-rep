import { Stack } from 'expo-router';

export default function FeedbackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="submit" />
      <Stack.Screen name="thank-you" />
    </Stack>
  );
}
