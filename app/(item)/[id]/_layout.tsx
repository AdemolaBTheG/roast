import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack } from 'expo-router'
import React from 'react'

export default function IdLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: true,headerTransparent:isLiquidGlassAvailable(),headerStyle:{
        backgroundColor:isLiquidGlassAvailable()?'transparent':undefined,
      } }} />
    </Stack>
  )
}
