import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Firebase Admin SDKの初期化
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
  );
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminDb = getFirestore();
const adminMessaging = getMessaging();

export async function POST(request: Request) {
  try {
    const { groupId, senderUid, title, body } = await request.json();

    if (!groupId || !senderUid) {
      return NextResponse.json({ error: "パラメータ不足" }, { status: 400 });
    }

    // 1. 同じ groupId を持ち、自分(senderUid)以外のユーザーを検索
    const usersSnap = await adminDb
      .collection("users")
      .where("groupId", "==", groupId)
      .get();

    const tokens: string[] = [];
    usersSnap.forEach((doc) => {
      if (doc.id !== senderUid) { // 👈 自分を除外するロジック
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json({ message: "送信対象の端末がありません" });
    }

    // 2. 自分以外の端末へ通知を一括送信
    const response = await adminMessaging.sendEachForMulticast({
      tokens: tokens,
      notification: {
        title: title || "買い物リスト更新",
        body: body || "リストが更新されました",
      },
    });

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error("通知送信エラー:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
