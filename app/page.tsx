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
} from "firebase/firestore";
import { Trash2, Plus, ShoppingBag } from "lucide-react";

interface Item {
  id: string;
  text: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");

  // Firestoreからリアルタイムでデータを受信
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

  // アイテムの削除（買い出し完了）
  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, "items", id));
  };

  return (
    <main className="w-full mx-auto min-h-screen bg-slate-50 p-4 pb-20">
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
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">
            買うものはすべて揃っています 🎉
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm transition hover:border-slate-200"
            >
              <span className="text-slate-700 font-medium break-all pr-2">
                {item.text}
              </span>
              <button
                onClick={() => deleteItem(item.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="買い出し完了（削除）"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
