import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SCREEN_NAMES, CONSTANTS } from '../utils/constants';
import { generateUUID, getCurrentTimestamp } from '../utils/helpers';
import DatabaseService from '../services/DatabaseService';
import { User, RegistrationProgress } from '../types';

type RegistrationScreenProps = {
  navigation: StackNavigationProp<any>;
};

export const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartRegistration = async () => {
    if (!name.trim() || !employeeId.trim()) {
      Alert.alert('Error', 'Please enter name and employee ID');
      return;
    }

    try {
      setLoading(true);

      // Create user record
      const userId = generateUUID();
      const now = getCurrentTimestamp();

      const user: User = {
        id: userId,
        name: name.trim(),
        employeeId: employeeId.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await DatabaseService.createUser(user);

      // Navigate to camera for face capture
      navigation.navigate(SCREEN_NAMES.REGISTRATION_CAMERA, { userId, userName: name });
    } catch (error) {
      Alert.alert('Error', `Failed to start registration: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Register New User</Text>
        <Text style={styles.headerSubtitle}>
          Capture face samples for authentication
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
            editable={!loading}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Registration Requirements</Text>
          <Text style={styles.infoText}>
            • Capture {CONSTANTS.MIN_SAMPLES_FOR_REGISTRATION} face samples{'\n'}
            • Face must be clearly visible{'\n'}
            • Good lighting conditions required{'\n'}
            • Look directly at camera{'\n'}
            • No glasses or face coverings
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleStartRegistration}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.buttonText}>Continue to Camera</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#e8f4ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
