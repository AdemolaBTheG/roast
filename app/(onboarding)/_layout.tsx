import { Stack } from 'expo-router'
import React from 'react'

export default function OnboardingLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="quiz/[step]" options={{ headerShown: false }} />
      <Stack.Screen name="rating" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="ai-consent" options={{ headerShown: false }} />
    </Stack>
  )
}
