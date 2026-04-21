import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../screens/HomeScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import VotingScreen from '../screens/VotingScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#e94560',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
        cardStyle: { backgroundColor: '#1a1a2e' },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: '🗳️ HandVote' }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{ title: 'Nuevo Evento' }}
      />
      <Stack.Screen
        name="Voting"
        component={VotingScreen}
        options={{ title: 'Capturar Votos', headerShown: false }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ title: 'Resultados' }}
      />
    </Stack.Navigator>
  );
}
