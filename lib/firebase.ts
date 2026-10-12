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
    // 1. ブラウザの通知サポートチェック
    if (!("Notification" in window)) {
      alert("このブラウザは通知をサポートしていません。");
      return null;
    }

    // 2. 通知権限の確認・獲得
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      alert("通知が許可されませんでした。iPhoneの「設定」>「通知」>「買い物リスト」を確認してください。");
      return null;
    }

    // 3. FCM (Messaging) のサポートチェック
    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      alert("この端末環境では FCM Messaging がサポートされていません。");
      return null;
    }

    // 4. Messaging の初期化とトークン取得
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    return token;
  } catch (error: any) {
    console.error("通知トークン取得エラー詳細:", error);
    alert("トークン取得中にエラーが発生しました: " + (error?.message || error));
    return null;
  }
};
