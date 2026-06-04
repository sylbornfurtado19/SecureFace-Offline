# Testing Guide

## Current Status

The mobile app test suite now passes locally.

Verified command:

```bash
cd mobile-app
npm test --silent
```

Observed result:

- 2 test suites passed
- 2 tests passed
- Exit code: 0

## What Is Covered

The current automated tests live in `mobile-app/__tests__/`:

- `liveness.test.ts`
- `antispoofing.test.ts`

These provide smoke coverage for the liveness and spoofing services.

## Recommended Test Commands

Run all mobile tests:

```bash
cd mobile-app
npm test --silent
```

Run Jest in watch mode:

```bash
cd mobile-app
npm test -- --watch
```

Run coverage:

```bash
cd mobile-app
npm test -- --coverage
```

## Manual App Checks

Use the Home screen actions to validate the main flows:

1. Register New User
2. Mark Attendance
3. View Attendance
4. Settings
5. Benchmark

For a quick smoke check, confirm the Benchmark screen opens and shows the model status.

## iOS Verification

When on macOS, verify the iOS setup with:

```bash
cd mobile-app/ios
pod install --repo-update
```

Then open the iOS workspace in Xcode and run on a simulator or device.

## Notes

- Model assets live in `mobile-app/assets/models/` and are required for on-device inference.
- The React Native Jest setup is wired through `babel.config.js` and passes on the local suite.
