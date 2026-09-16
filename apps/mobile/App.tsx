import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { HomeScreen } from './src/screens/HomeScreen'
import { WordbooksScreen } from './src/screens/WordbooksScreen'
import { ReviewScreen } from './src/screens/ReviewScreen'
import { StatsScreen } from './src/screens/StatsScreen'
import { MeScreen } from './src/screens/MeScreen'
import { PracticeScreen } from './src/screens/PracticeScreen'

export type RootStackParamList = {
  Home: undefined
  Wordbooks: undefined
  Review: undefined
  Practice: undefined
  Stats: undefined
  Me: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#111111' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Vocabulary Agent' }} />
          <Stack.Screen name="Wordbooks" component={WordbooksScreen} options={{ title: '选择词书' }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ title: '复习' }} />
          <Stack.Screen name="Practice" component={PracticeScreen} options={{ title: '专项练习' }} />
          <Stack.Screen name="Stats" component={StatsScreen} options={{ title: '学习报告' }} />
          <Stack.Screen name="Me" component={MeScreen} options={{ title: '我的' }} />
        </Stack.Navigator>
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  )
}