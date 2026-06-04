iOS build instructions
======================

Use this guide to install CocoaPods and run the iOS workspace for `mobile-app`.

Prerequisites (macOS):
- Xcode installed
- Ruby & CocoaPods: `sudo gem install cocoapods` or use Homebrew
- Node.js, Yarn/npm installed

Steps:

1. From the project root, change to the mobile app folder:

```bash
cd mobile-app
```

2. Install JS dependencies:

```bash
yarn install
# or
npm install
```

3. Install CocoaPods in the `ios` folder:

```bash
cd ios
pod install
```

4. Open the workspace in Xcode and build/run on a device or simulator:

```bash
open SecureFace-Offline.xcworkspace
```

Notes:
- If `pod install` fails, ensure you are on macOS and CocoaPods is installed.
- The project Podfile targets iOS 13.0. Adjust if needed.
