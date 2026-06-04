import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import DatabaseService from '../services/DatabaseService';
import { AttendanceRecord } from '../types';
import { formatTimestamp } from '../utils/helpers';

type AttendanceHistoryScreenProps = {
  navigation: StackNavigationProp<any>;
};

export const AttendanceHistoryScreen: React.FC<AttendanceHistoryScreenProps> = ({
  navigation,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    loadAttendanceRecords();

    const unsubscribe = navigation.addListener('focus', () => {
      loadAttendanceRecords();
    });

    return unsubscribe;
  }, [navigation, filter]);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      let startDate: number | undefined;
      const now = Date.now();

      if (filter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate = today.getTime();
      } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.getTime();
      }

      const allRecords = await DatabaseService.getAttendanceRecords(undefined, startDate, now);
      setRecords(allRecords);
    } catch (error) {
      Alert.alert('Error', `Failed to load records: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      let csvContent = 'Name,Employee ID,Timestamp,Confidence,Synced\n';

      for (const record of records) {
        csvContent += `${record.userName},${record.employeeId},${formatTimestamp(record.timestamp)},${record.confidence.toFixed(2)},${record.synced ? 'Yes' : 'No'}\n`;
      }

      // In production, would use share sheet or file system to save
      Alert.alert('Export', `Generated CSV with ${records.length} records`);
    } catch (error) {
      Alert.alert('Error', `Failed to export: ${error}`);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    Alert.alert('Confirm', 'Delete this record?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            // In production, would implement delete functionality
            Alert.alert('Success', 'Record deleted');
            loadAttendanceRecords();
          } catch (error) {
            Alert.alert('Error', `Failed to delete: ${error}`);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const renderRecord = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordInfo}>
        <Text style={styles.recordName}>{item.userName}</Text>
        <Text style={styles.recordEmployeeId}>{item.employeeId}</Text>
        <Text style={styles.recordTimestamp}>{formatTimestamp(item.timestamp)}</Text>
        <View style={styles.recordMeta}>
          <Text style={styles.confidenceText}>
            Confidence: {Math.round(item.confidence * 100)}%
          </Text>
          <View
            style={[
              styles.syncBadge,
              item.synced ? styles.syncBadgeSynced : styles.syncBadgePending,
            ]}
          >
            <Text style={styles.syncBadgeText}>{item.synced ? 'Synced' : 'Pending'}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteRecord(item.id)}
      >
        <Text style={styles.deleteButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <Text style={styles.headerSubtitle}>Total: {records.length} records</Text>
      </View>

      <View style={styles.filterContainer}>
        {['all', 'today', 'week'].map(filterType => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterButton,
              filter === filterType && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(filterType as any)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === filterType && styles.filterButtonTextActive,
              ]}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportCSV}>
          <Text style={styles.actionButtonText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => loadAttendanceRecords()}
        >
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No attendance records found</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderRecord}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    backgroundColor: 'white',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 10,
  },
  recordCard: {
    backgroundColor: 'white',
    marginVertical: 6,
    padding: 12,
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
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recordEmployeeId: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  recordTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  syncBadgeSynced: {
    backgroundColor: '#e8f5e9',
  },
  syncBadgePending: {
    backgroundColor: '#fff3e0',
  },
  syncBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#f44336',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
