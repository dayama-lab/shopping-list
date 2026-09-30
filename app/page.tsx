"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Trash2, Plus, ShoppingBag, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";

interface Comment {
  id: string;
  text: string;
  createdAt: Timestamp | null;
}

interface Item {
  id: string;
  text: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  // どのアイテムのコメントエリアを開いているか管理するID
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);

  // Firestoreから買い物リストをリアルタイム取得
  useEffect(() => {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Item[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text,
      }));
      setItems(list);
    });

    return () => unsubscribe();
  }, []);

  // アイテムの追加
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    await addDoc(collection(db, "items"), {
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    setText("");
  };

  // アイテムの削除
  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, "items", id));
  };

  // コメント開閉の切り替え
  const toggleComment = (id: string) => {
    setOpenCommentId(openCommentId === id ? null : id);
  };

  return (
    <main className="w-full min-h-screen bg-slate-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-2 mb-6 pt-4">
          <ShoppingBag className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-800">買い物リスト</h1>
        </header>

        {/* 入力フォーム */}
        <form onSubmit={addItem} className="flex gap-2 mb-6">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="買うものを入力..."
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
          <button
            type="submit"
            className="px-5 py-3 bg-emerald-600 text-white font-medium rounded-xl shadow-sm hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </form>

        {/* リスト一覧 */}
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">
              買うものはすべて揃っています 🎉
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition"
              >
                {/* メインアイテム表示 */}
                <div className="flex items-center justify-between p-4">
                  <span className="text-slate-700 font-medium break-all pr-2">
                    {item.text}
                  </span>
                  <div className="flex items-center gap-1">
                    {/* コメントボタン */}
                    <button
                      onClick={() => toggleComment(item.id)}
                      className={`p-2 rounded-lg transition flex items-center gap-1 text-xs ${
                        openCommentId === item.id
                          ? "bg-emerald-50 text-emerald-600"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      }`}
                      title="コメントを表示"
                    >
                      <MessageSquare className="w-5 h-5" />
                      {openCommentId === item.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* 削除ボタン */}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                      title="買い出し完了（削除）"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* コメントエリア（開いている時だけ表示） */}
                {openCommentId === item.id && (
                  <CommentSection itemId={item.id} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

// コメント欄のコンポーネント
function CommentSection({ itemId }: { itemId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  // Firestoreから該当アイテムのコメント一覧を取得
  useEffect(() => {
    const q = query(
      collection(db, "items", itemId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text,
        createdAt: doc.data().createdAt,
      }));
      setComments(list);
    });

    return () => unsubscribe();
  }, [itemId]);

  // コメントの投稿
  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await addDoc(collection(db, "items", itemId, "comments"), {
      text: commentText.trim(),
      createdAt: serverTimestamp(),
    });
    setCommentText("");
  };

  return (
    <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-3">
      {/* コメント一覧 */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic">コメントはまだありません。「父が買います」などを入力できます。</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700 shadow-2xs"
            >
              <p className="break-all">{comment.text}</p>
            </div>
          ))
        )}
      </div>

      {/* コメント入力フォーム */}
      <form onSubmit={addComment} className="flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="コメントを入力（例: 父が買います）"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  );
}
