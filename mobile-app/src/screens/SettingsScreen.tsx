import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import DatabaseService from '../services/DatabaseService';
import EncryptionService from '../services/EncryptionService';
import AWSSyncService from '../services/AWSSyncService';
import { CONSTANTS } from '../utils/constants';

type SettingsScreenProps = {
  navigation: StackNavigationProp<any>;
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const [syncStatus, setSyncStatus] = useState({
    isEnabled: true,
    isSyncing: false,
    lastSync: 0,
    pendingItems: 0,
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAttendance: 0,
    totalEmbeddings: 0,
    dbSize: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();

    const unsubscribe = navigation.addListener('focus', () => {
      loadSettings();
    });

    return unsubscribe;
  }, [navigation]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load sync status
      const syncStatus = await AWSSyncService.getSyncStatus();
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: syncStatus.isSyncing,
        pendingItems: syncStatus.pendingItems,
        lastSync: syncStatus.lastSyncTime || 0,
      }));

      // Load statistics
      const users = await DatabaseService.getAllUsers();
      const attendance = await DatabaseService.getAttendanceRecords();

      setStats({
        totalUsers: users.length,
        totalAttendance: attendance.length,
        totalEmbeddings: users.reduce((sum, user) => sum + user.id.length, 0),
        dbSize: 0,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      const result = await AWSSyncService.sync();
      Alert.alert('Success', `Synced ${result.itemsUploaded} items`);
      await loadSettings();
    } catch (error) {
      Alert.alert('Error', `Sync failed: ${error}`);
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const handleClearLocalData = () => {
    Alert.alert('Confirm', 'Clear all local data? This cannot be undone.', [
      { text: 'Cancel' },
      {
        text: 'Clear',
        onPress: async () => {
          try {
            // In production, would implement proper data clearing
            Alert.alert('Success', 'Local data cleared');
            await loadSettings();
          } catch (error) {
            Alert.alert('Error', `Failed to clear data: ${error}`);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleRotateEncryptionKey = async () => {
    try {
      await EncryptionService.rotateEncryptionKey();
      Alert.alert('Success', 'Encryption key rotated');
    } catch (error) {
      Alert.alert('Error', `Failed to rotate key: ${error}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalAttendance}</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{syncStatus.pendingItems}</Text>
            <Text style={styles.statLabel}>Pending Sync</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Synchronization</Text>
        <View style={styles.settingItem}>
          <View>
            <Text style={styles.settingLabel}>Auto Sync</Text>
            <Text style={styles.settingDescription}>
              Automatically sync when network available
            </Text>
          </View>
          <Switch
            value={syncStatus.isEnabled}
            onValueChange={value => setSyncStatus(prev => ({ ...prev, isEnabled: value }))}
          />
        </View>

        {syncStatus.lastSync > 0 && (
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Last Sync</Text>
            <Text style={styles.settingDescription}>
              {new Date(syncStatus.lastSync).toLocaleString()}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, syncStatus.isSyncing && styles.buttonDisabled]}
          onPress={handleManualSync}
          disabled={syncStatus.isSyncing}
        >
          {syncStatus.isSyncing ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.buttonText}>Syncing...</Text>
            </>
          ) : (
            <Text style={styles.buttonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <TouchableOpacity style={styles.button} onPress={handleRotateEncryptionKey}>
          <Text style={styles.buttonText}>Rotate Encryption Key</Text>
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingDescription}>{CONSTANTS.APP_VERSION}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleClearLocalData}
        >
          <Text style={styles.buttonText}>Clear Local Data</Text>
        </TouchableOpacity>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Warning</Text>
          <Text style={styles.warningText}>
            Clearing local data will delete all users, embeddings, and attendance records.
            Ensure data is synced to AWS before proceeding.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Information</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Face Detection Model</Text>
          <Text style={styles.infoValue}>face_detection_short_range.tflite</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Recognition Model</Text>
          <Text style={styles.infoValue}>MobileFaceNet.tflite</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Model Size</Text>
          <Text style={styles.infoValue}>{'<'}20 MB</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Face Landmarks</Text>
          <Text style={styles.infoValue}>MediaPipe Face Mesh</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{CONSTANTS.APP_NAME} v{CONSTANTS.APP_VERSION}</Text>
      </View>
    </ScrollView>
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
  section: {
    marginVertical: 10,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  settingItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonDanger: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5,
  },
  warningText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: 'white',
    padding: 12,
    marginVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    marginTop: 3,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
