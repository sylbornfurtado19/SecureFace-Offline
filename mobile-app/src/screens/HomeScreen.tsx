import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import DatabaseService from '../services/DatabaseService';
import AWSSyncService from '../services/AWSSyncService';
import { SCREEN_NAMES } from '../utils/constants';
import { User } from '../types';

type HomeScreenProps = {
  navigation: StackNavigationProp<any>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    pendingItems: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    loadSyncStatus();

    const unsubscribe = navigation.addListener('focus', () => {
      loadUsers();
      loadSyncStatus();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await DatabaseService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await AWSSyncService.getSyncStatus();
      setSyncStatus({
        isSyncing: status.isSyncing,
        pendingItems: status.pendingItems,
      });
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleManualSync = async () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await AWSSyncService.sync();
      await loadSyncStatus();
      alert(`Sync completed. Items uploaded: ${result.itemsUploaded}`);
    } catch (error) {
      alert(`Sync failed: ${error}`);
    } finally {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SecureFace-Offline</Text>
        <Text style={styles.subtitle}>Offline Facial Recognition</Text>
      </View>

      <View style={styles.syncCard}>
        <View style={styles.syncInfo}>
          <Text style={styles.syncTitle}>Sync Status</Text>
          <Text style={styles.syncDetails}>
            Pending items: {syncStatus.pendingItems}
          </Text>
          {syncStatus.isSyncing && (
            <View style={styles.syncingIndicator}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.syncingText}>Syncing...</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.syncButton, syncStatus.isSyncing && styles.syncButtonDisabled]}
          onPress={handleManualSync}
          disabled={syncStatus.isSyncing}
        >
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate(SCREEN_NAMES.REGISTRATION)}
        >
          <Text style={styles.actionButtonText}>Register New User</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate(SCREEN_NAMES.RECOGNITION)}
        >
          <Text style={styles.actionButtonText}>Mark Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate(SCREEN_NAMES.ATTENDANCE_HISTORY)}
        >
          <Text style={styles.actionButtonText}>View Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate(SCREEN_NAMES.SETTINGS)}
        >
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate(SCREEN_NAMES.BENCHMARK)}
        >
          <Text style={styles.actionButtonText}>Benchmark</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.usersSection}>
        <Text style={styles.sectionTitle}>Registered Users ({users.length})</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>No users registered</Text>
        ) : (
          <View>
            {users.map(user => (
              <View key={user.id} style={styles.userCard}>
                <View>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmployeeId}>{user.employeeId}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  syncCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncInfo: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  syncDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  syncingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  syncingText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  syncButtonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'white',
    marginHorizontal: 5,
    marginVertical: 8,
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  usersSection: {
    marginTop: 20,
    marginHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
  userCard: {
    backgroundColor: 'white',
    padding: 12,
    marginVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userEmployeeId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
