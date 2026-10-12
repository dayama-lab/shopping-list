import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 🔑 ログイン認証
import { getMessaging, getToken, isSupported } from "firebase/messaging"; // 🔔 プッシュ通知

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// エクスポート（他ファイルで使えるようにする）
export const db = getFirestore(app);
export const auth = getAuth(app); // 🔑 ログイン用インスタンス（残してあります！）

// 🔔 通知の許可を得て FCM トークンを取得する関数
export const requestNotificationPermission = async () => {
  try {
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      console.log("このブラウザは通知をサポートしていません");
      return null;
    }

    // ① iOS/Safariの通知権限状態を確認・要求
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.log("通知が許可されていません:", permission);
      return null;
    }

    // ② Service Worker の準備完了を待ってから FCM トークンを取得
    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (error) {
    console.error("通知トークン取得エラー:", error);
    return null;
  }
};
