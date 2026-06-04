import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomeScreen } from './src/screens/HomeScreen';
import { RegistrationScreen } from './src/screens/RegistrationScreen';
import { RegistrationCameraScreen } from './src/screens/RegistrationCameraScreen';
import { RecognitionScreen } from './src/screens/RecognitionScreen';
import { AttendanceHistoryScreen } from './src/screens/AttendanceHistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BenchmarkScreen } from './src/screens/BenchmarkScreen';

import DatabaseService from './src/services/DatabaseService';
import EncryptionService from './src/services/EncryptionService';
import AWSSyncService from './src/services/AWSSyncService';
import CameraService from './src/services/CameraService';

import { SCREEN_NAMES } from './src/utils/constants';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name={SCREEN_NAMES.HOME} component={HomeScreen} />
    <Stack.Screen name={SCREEN_NAMES.REGISTRATION} component={RegistrationScreen} />
    <Stack.Screen name={SCREEN_NAMES.REGISTRATION_CAMERA} component={RegistrationCameraScreen} />
    <Stack.Screen name={SCREEN_NAMES.RECOGNITION} component={RecognitionScreen} />
    <Stack.Screen name={SCREEN_NAMES.ATTENDANCE_HISTORY} component={AttendanceHistoryScreen} />
    <Stack.Screen name={SCREEN_NAMES.SETTINGS} component={SettingsScreen} />
    <Stack.Screen name={SCREEN_NAMES.BENCHMARK} component={BenchmarkScreen} />
  </Stack.Navigator>
);

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsInitializing(true);

      // Initialize encryption
      await EncryptionService.initialize();

      // Initialize database
      await DatabaseService.initialize();

      // Initialize camera
      await CameraService.initialize();

      // Initialize AWS sync (without endpoint for now - would be set via config)
      // AWSSyncService.initialize('https://api.example.com', 'api-key');

      setIsInitializing(false);
    } catch (error) {
      setInitError(`Initialization failed: ${error}`);
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{initError}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <HomeStack />
    </NavigationContainer>
  );
};

export default App;
