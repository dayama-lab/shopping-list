importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// サービスワーカー内での初期化（デフォルト構成）
if (!firebase.apps.length) {
  firebase.initializeApp({
    messagingSenderId: "321431363901",
  });
}

const messaging = firebase.messaging();

// バックグラウンドでの通知受信処理
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || '買い物リスト';
  const notificationOptions = {
    body: payload.notification?.body || '新しい通知があります',
    icon: '/shoppinglist_アイコン.JPG'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
