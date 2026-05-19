import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyA1TFHSoYhbKtIhDbUysLA2Gu5un0kEtws",
 
  authDomain: "{
  "project_info": {
    "project_number": "1034362432289",
    "project_id": "p2p-marketplace-92895",
    "storage_bucket": "p2p-marketplace-92895.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:1034362432289:android:296321588887de27e06c60",
        "android_client_info": {
          "package_name": "com.twmcreated.CompusMarketApp"
        }
      },
      "oauth_client": [
        {
          "client_id": "1034362432289-ro0crh1pksqu2m720q2mgud449uajg12.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        {
          "current_key": "AIzaSyA1TFHSoYhbKtIhDbUysLA2Gu5un0kEtws"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "1034362432289-ro0crh1pksqu2m720q2mgud449uajg12.apps.googleusercontent.com",
              "client_type": 3
            }
          ]
        }
      }
    }
  ],
  "configuration_version": "1"
}",
  projectId: "p2p-marketplace-92895",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "1:1034362432289:android:296321588887de27e06c60",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
