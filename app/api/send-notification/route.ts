import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token, title, body } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // ビルドエラーを防ぐため、リクエスト実行時に動的に firebase-admin を読み込む
    const admin = require("firebase-admin");

    if (!admin.apps.length) {
      try {
        const serviceAccount = JSON.parse(
          process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}"
        );

        if (serviceAccount.project_id) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        }
      } catch (initError) {
        console.error("Firebase admin initialization error:", initError);
      }
    }

    if (!admin.apps.length) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not initialized" },
        { status: 500 }
      );
    }

    const message = {
      notification: {
        title: title || "買い物リスト更新",
        body: body || "新しいアイテムが追加されました！",
      },
      token: token,
    };

    const response = await admin.messaging().send(message);
    return NextResponse.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
