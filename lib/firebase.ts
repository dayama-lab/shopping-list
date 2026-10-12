import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);

// 🔔 通知の許可を得て FCM トークンを取得する関数
export const requestNotificationPermission = async () => {
  try {
    if (!("Notification" in window)) {
      alert("このブラウザは通知をサポートしていません。");
      return null;
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      alert("通知が許可されませんでした。iPhoneの「設定」>「通知」>「買い物リスト」を確認してください。");
      return null;
    }

    const messagingSupported = await isSupported();
    if (!messagingSupported) {
      alert("この端末環境では FCM Messaging がサポートされていません。");
      return null;
    }

    // 🔑 VAPIDキー（公開鍵）を確実に取得
    const rawVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const vapidKey = (rawVapidKey && rawVapidKey.trim().length > 0)
      ? rawVapidKey.trim()
      : "BJufpWiyLxRCVT2r3sJ68Tca1G2MBH27QhVR3OAd2vcQgurtBk2DT8pJV0oZYIJctH5MqSUUC8sqL2jlQTJbbHU";

    const messaging = getMessaging(app);

    // サービスワーカーが準備完了している場合はその登録情報も渡す
    let swRegistration = undefined;
    if ("serviceWorker" in navigator) {
      swRegistration = await navigator.serviceWorker.ready;
    }

    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    return token;
  } catch (error: any) {
    console.error("通知トークン取得エラー詳細:", error);
    alert("トークン取得中にエラーが発生しました: " + (error?.message || error));
    return null;
  }
};
