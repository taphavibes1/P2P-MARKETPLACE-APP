# Ugbowo Market

A hyper-local P2P student marketplace for UNIBEN Ugbowo students in Benin City, Nigeria.

## Tech Stack
- React Native + Expo (managed workflow)
- Firebase (Auth, Firestore, Storage)
- React Navigation (native stack + bottom tabs)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage
   - Copy your config into `src/firebase/config.js`
   - Deploy Firestore rules: `firebase deploy --only firestore:rules`

3. Start the dev server:
   ```bash
   npx expo start
   ```

## Build Progress
- [x] Step 1: Project setup + navigation + theme
- [ ] Step 2: Auth screens + registration + ID upload
- [ ] Step 3: Home + listings (browse only)
- [ ] Step 4: Create listing + image upload + geofence
- [ ] Step 5: Chat system
- [ ] Step 6: Map with safe zones
- [ ] Step 7: Escrow payment flow + QR
- [ ] Step 8: Profile + ratings
