import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import React from 'react'

export default function AddLayout() {
    const router = useRouter()

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: true,
                    headerTitle:'New Reply',
                    headerTransparent:isLiquidGlassAvailable(),
                    headerStyle:{
                        backgroundColor:isLiquidGlassAvailable()?"transparent":'#f2f2f2',
                    }
                  
                }}
            />
        </Stack>
    )
}
