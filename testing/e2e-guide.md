# E2E Testing Guide

## End-to-End Testing Overview

Complete workflow testing from user registration through attendance marking and AWS sync.

## Test Environment Setup

```bash
# Start backend and AWS services
docker-compose up -d

# Install testing dependencies
npm install --save-dev cypress @testing-library/react-native

# Start app in simulator/emulator
npm run android
```

## Registration Flow E2E Test

### Test Script
```bash
# Start app
npm run android

# Manual steps:
1. Open app
2. Tap "Register New User"
3. Enter name: "Test User"
4. Enter employee ID: "EMP-TEST-001"
5. Tap "Proceed to Camera"
6. Capture 5 face samples
7. Verify success message
8. Check HomeScreen shows new user

# Verify in database:
sqlite3 databases/faceauth.db "SELECT * FROM users;"
```

### Automated E2E Test
```typescript
describe('E2E: User Registration', () => {
  it('should complete full registration workflow', async () => {
    // 1. Navigate to registration
    await app.press('register-button');
    
    // 2. Enter user info
    await app.typeText('name-input', 'Test User');
    await app.typeText('employee-id-input', 'EMP-001');
    await app.press('proceed-button');
    
    // 3. Capture samples
    for (let i = 0; i < 5; i++) {
      await app.press('capture-button');
      await app.sleep(2000); // Wait for capture
    }
    
    // 4. Verify completion
    await expect(element(by.text('Registration Complete'))).toBeVisible();
    
    // 5. Verify database
    const user = await database.query('SELECT * FROM users WHERE name = ?', ['Test User']);
    expect(user).toBeDefined();
  });
});
```

## Recognition Flow E2E Test

### Test Procedure
```bash
# Prerequisites: User already registered

# Manual steps:
1. Open app (HomeScreen)
2. Tap "Mark Attendance"
3. Allow camera permissions
4. Position face in frame
5. Complete liveness challenges
   - Blink when prompted
   - Smile when prompted
   - Turn head left
   - Turn head right
6. Verify attendance marked
7. Check HomeScreen updated

# Verify in database:
sqlite3 databases/faceauth.db "SELECT * FROM attendance LIMIT 1;"
```

### Automated E2E Test
```typescript
describe('E2E: Face Recognition', () => {
  it('should recognize face and mark attendance', async () => {
    // 1. Navigate to recognition
    await app.press('attendance-button');
    
    // 2. Wait for face detection
    await expect(element(by.text('Face Detected'))).toBeVisible({ timeout: 5000 });
    
    // 3. Simulate liveness challenges
    await app.press('blink-ready-button');
    await app.sleep(3000); // User blinks
    
    await app.press('smile-ready-button');
    await app.sleep(3000); // User smiles
    
    // 4. Verify recognition
    await expect(element(by.text('Recognition Successful'))).toBeVisible();
    
    // 5. Verify attendance recorded
    await expect(element(by.text('Attendance Marked'))).toBeVisible();
    
    // 6. Check database
    const attendance = await database.query('SELECT * FROM attendance ORDER BY timestamp DESC LIMIT 1');
    expect(attendance.synced).toBe(false); // Offline
  });
});
```

## Offline Sync E2E Test

### Test Procedure
```bash
# Prerequisites: App configured with AWS backend

# Manual steps:
1. Disable network (airplane mode)
2. Mark 3 attendances
3. Check sync queue has 3 items
4. Enable network
5. Tap "Sync Now"
6. Wait for sync completion
7. Verify sync count updates
8. Verify items marked as synced

# Verify sync completion:
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/attendance?userId=user-id
```

### Automated E2E Test
```typescript
describe('E2E: Offline to Online Sync', () => {
  it('should sync pending items to AWS', async () => {
    // 1. Disable network
    await device.disableNetwork();
    
    // 2. Create attendances
    for (let i = 0; i < 3; i++) {
      await markAttendance();
      await app.sleep(1000);
    }
    
    // 3. Verify pending sync items
    const pending = await database.query('SELECT * FROM sync_queue WHERE synced = 0');
    expect(pending.length).toBe(3);
    
    // 4. Enable network
    await device.enableNetwork();
    
    // 5. Sync
    await app.press('sync-button');
    
    // 6. Wait for sync to complete
    await waitFor(element(by.text('Sync Complete')))
      .toBeVisible()
      .withTimeout(30000);
    
    // 7. Verify all synced
    const synced = await database.query('SELECT * FROM sync_queue WHERE synced = 1');
    expect(synced.length).toBe(3);
    
    // 8. Verify in backend
    const response = await api.getAttendance(userId);
    expect(response.data.length).toBeGreaterThanOrEqual(3);
  });
});
```

## Performance E2E Tests

### Recognition Latency Test
```typescript
describe('E2E: Performance', () => {
  it('should complete recognition within 1 second', async () => {
    const startTime = Date.now();
    
    // Start recognition
    await app.press('attendance-button');
    
    // Wait for completion
    await expect(element(by.text('Recognition Successful'))).toBeVisible();
    
    const latency = Date.now() - startTime;
    
    // Should be under 1 second
    expect(latency).toBeLessThan(1000);
    
    console.log(`Recognition latency: ${latency}ms`);
  });
  
  it('should complete liveness within 30 seconds', async () => {
    const startTime = Date.now();
    
    // Initiate recognition (includes liveness)
    await app.press('attendance-button');
    
    // Complete all challenges
    // ... (liveness challenge steps)
    
    const latency = Date.now() - startTime;
    
    // Should be under 30 seconds
    expect(latency).toBeLessThan(30000);
    
    console.log(`Liveness latency: ${latency}ms`);
  });
});
```

## Memory E2E Tests

```typescript
describe('E2E: Memory Management', () => {
  it('should not exceed 500MB memory during operations', async () => {
    const initialMemory = await device.getMemory();
    
    // Perform 10 recognitions
    for (let i = 0; i < 10; i++) {
      await performRecognition();
    }
    
    const finalMemory = await device.getMemory();
    const maxMemory = Math.max(initialMemory, finalMemory);
    
    expect(maxMemory).toBeLessThan(500 * 1024 * 1024); // 500MB
  });
});
```

## Security E2E Tests

### Encryption Test
```typescript
describe('E2E: Security', () => {
  it('should encrypt embeddings before storage', async () => {
    // Complete registration
    await registerUser();
    
    // Check database - embeddings should be encrypted
    const embeddings = await database.query('SELECT embedding FROM embeddings LIMIT 1');
    const embedding = embeddings[0].embedding;
    
    // Should be base64 encoded encrypted data, not plain floats
    expect(() => {
      const decrypted = JSON.parse(embedding);
      // Should fail - it's encrypted
    }).toThrow();
  });
  
  it('should not store raw face images', async () => {
    // Complete recognition
    await performRecognition();
    
    // Check file system - no image files
    const files = await device.getFileSystemContents('/data/data/com.secureface.offline/');
    const imageFiles = files.filter(f => f.match(/\.(jpg|png|raw)$/));
    
    expect(imageFiles.length).toBe(0);
  });
});
```

## User Journey E2E Tests

### Complete Workday Test
```typescript
describe('E2E: Complete Workday', () => {
  it('should handle full workday workflow', async () => {
    // Morning: Registration (if needed)
    if (!userExists) {
      await registerUser('John Doe', 'EMP-001');
    }
    
    // Morning: First attendance
    await markAttendance();
    await waitForSync();
    
    // Midday: Check attendance history
    await app.press('history-button');
    await expect(element(by.text('Today'))).toBeVisible();
    await app.press('back-button');
    
    // Afternoon: Check statistics
    await app.press('settings-button');
    await expect(element(by.text('Statistics'))).toBeVisible();
    
    // Evening: Manual sync
    await app.press('sync-button');
    await waitFor(element(by.text('Sync Complete')))
      .toBeVisible()
      .withTimeout(30000);
    
    // Verify all data synced
    const syncQueue = await database.query('SELECT * FROM sync_queue WHERE synced = 0');
    expect(syncQueue.length).toBe(0);
  });
});
```

## Test Execution

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suite
npm run test:e2e -- --grep "Registration"

# Run with reporter
npm run test:e2e -- --reporter json > results.json

# Generate report
npm run test:report
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Merges to main
- Scheduled daily

Results tracked in GitHub Actions.

## Troubleshooting

### Test Timeouts
```bash
# Increase timeout
jest.setTimeout(60000);

# Or specific test
it('test', async () => {
  // ...
}, 60000);
```

### Network Issues
```bash
# Mock network calls
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({
    isConnected: true,
    isInternetReachable: true,
  }),
}));
```

### Device Issues
```bash
# Restart emulator
adb emu kill
emulator -avd my-device

# Clear app data
adb shell pm clear com.secureface.offline
```
