importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// ※ご自身の Firebase 設定値をそのまま設定します
firebase.initializeApp({
  apiKey: "AIzaSyBhAacR3bLRa-0OklDoReQ-SyzS24NmrHA",
  authDomain: "shopping-list-dayama.firebaseapp.com",
  projectId: "shopping-list-dayama",
  storageBucket: "shopping-list-dayama.firebasestorage.app",
  messagingSenderId: "321431363901",
  appId: "1:321431363901:web:9461baece91bf34f276554"
});

const messaging = firebase.messaging();

// バックグラウンドでの通知受信処理
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title || '買い物リスト';
  const notificationOptions = {
    body: payload.notification.body || '新しい通知があります',
    icon: '/ショッピングリスト_アイコン.JPG'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});