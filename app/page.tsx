"use client";

import React, { useState, useEffect } from "react";
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
import {
  Trash2,
  Plus,
  ShoppingBag,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Store,
  Filter,
  Calendar,
  AlertCircle,
} from "lucide-react";

// 店舗カテゴリーの定義
const STORES = ["すべて", "サミット", "まいばすけっと", "ドラッグストア", "100均", "AVE", "その他"] as const;
// 優先度の定義
const PRIORITIES = ["高", "中", "低"] as const;

interface Comment {
  id: string;
  text: string;
  createdAt: Timestamp | null;
}

interface Item {
  id: string;
  text: string;
  store?: string;
  priority?: string;
  dueDate?: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>("中");
  const [dueDate, setDueDate] = useState<string>("");
  const [filterStore, setFilterStore] = useState<string>("すべて");
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);

  // Firestoreから買い物リストをリアルタイム取得
  useEffect(() => {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Item[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text || "",
        store: doc.data().store || "その他",
        priority: doc.data().priority || "中",
        dueDate: doc.data().dueDate || "",
      }));

      // 期限（dueDate）が近い順（昇順）に並び替え
      list.sort((a, b) => {
        const dateA = a.dueDate || "";
        const dateB = b.dueDate || "";
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      });

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
      store: selectedStore || "その他",
      priority: selectedPriority,
      dueDate: dueDate || "",
      createdAt: serverTimestamp(),
    });

    setText("");
    setSelectedStore(null);
    setSelectedPriority("中");
    setDueDate("");
  };

  // アイテムの削除
  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, "items", id));
  };

  // コメント開閉の切り替え
  const toggleComment = (id: string) => {
    setOpenCommentId(openCommentId === id ? null : id);
  };

  // 絞り込みフィルターの適用
  const filteredItems = items.filter((item) => {
    if (filterStore === "すべて") return true;
    return item.store === filterStore;
  });

  return (
    <main className="w-full min-h-screen bg-slate-50 p-3 sm:p-6 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center gap-2 mb-6 pt-2">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">買い物リスト</h1>
        </header>

        {/* 登録フォーム */}
        <form
          onSubmit={addItem}
          className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs mb-6 space-y-4"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="買うものを入力..."
              className="flex-1 px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center min-w-[60px]"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* 店名タグ */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <Store className="w-4 h-4 text-slate-400 flex-shrink-0 mr-1" />
            {STORES.filter((s) => s !== "すべて").map((storeName) => (
              <button
                key={storeName}
                type="button"
                onClick={() =>
                  setSelectedStore(selectedStore === storeName ? null : storeName)
                }
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition border ${
                  selectedStore === storeName
                    ? "bg-emerald-600 text-white font-medium border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {storeName}
              </button>
            ))}
          </div>

          {/* 優先度 ＆ 期限 */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 優先度:
              </span>
              <div className="flex gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPriority(p)}
                    className={`px-2.5 py-1 rounded-md font-medium border transition ${
                      selectedPriority === p
                        ? p === "高"
                          ? "bg-red-500 text-white border-red-500"
                          : p === "中"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-blue-500 text-white border-blue-500"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 期限:
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-md bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </form>

        {/* 絞り込みタブ */}
        <div className="mb-4">
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-2 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>表示するお店で絞り込み:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {STORES.map((storeName) => (
              <button
                key={storeName}
                type="button"
                onClick={() => setFilterStore(storeName)}
                className={`px-3 py-1.5 rounded-full whitespace-nowrap border transition ${
                  filterStore === storeName
                    ? "bg-slate-800 text-white border-slate-800 font-medium shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {storeName}
              </button>
            ))}
          </div>
        </div>

        {/* テーブル表示 */}
        <div className="bg-white rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold">
                  <th className="py-3 px-3 border-r border-slate-800 w-[45%]">必要なもの</th>
                  <th className="py-3 px-3 border-r border-slate-800 w-[25%]">お店</th>
                  <th className="py-3 px-3 border-r border-slate-800 text-center w-[12%]">優先度</th>
                  <th className="py-3 px-3 text-center w-[18%]">期限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs sm:text-sm">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-slate-400 py-8">
                      {filterStore === "すべて"
                        ? "買うものはすべて揃っています 🎉"
                        : `「${filterStore}」で買うものはありません 🎉`}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="p-3 border-r border-slate-800 align-middle">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 text-base break-all">
                              {item.text}
                            </span>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <button
                                onClick={() => toggleComment(item.id)}
                                className={`p-1.5 rounded-md transition flex items-center gap-0.5 text-xs ${
                                  openCommentId === item.id
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                <MessageSquare className="w-4 h-4" />
                                {openCommentId === item.id ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 border-r border-slate-800 align-middle">
                          <span className="inline-block px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                            {item.store}
                          </span>
                        </td>

                        <td className="p-3 border-r border-slate-800 text-center align-middle font-medium">
                          <span
                            className={
                              item.priority === "高"
                                ? "text-red-600 font-bold"
                                : item.priority === "中"
                                ? "text-amber-600"
                                : "text-slate-500"
                            }
                          >
                            {item.priority || "中"}
                          </span>
                        </td>

                        <td className="p-3 text-center align-middle text-slate-700 font-mono text-xs whitespace-pre-line">
                          {item.dueDate ? item.dueDate.replace(/-/g, "/") : "-"}
                        </td>
                      </tr>

                      {openCommentId === item.id && (
                        <tr>
                          <td colSpan={4} className="bg-slate-50 p-0 border-b border-slate-800">
                            <CommentSection itemId={item.id} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function CommentSection({ itemId }: { itemId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "items", itemId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text || "",
        createdAt: doc.data().createdAt || null,
      }));
      setComments(list);
    });

    return () => unsubscribe();
  }, [itemId]);

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await addDoc(collection(db, "items", itemId, "comments"), {
      text: commentText.trim(),
      createdAt: serverTimestamp(),
    });
    setCommentText("");
  };

  const deleteComment = async (commentId: string) => {
    await deleteDoc(doc(db, "items", itemId, "comments", commentId));
  };

  return (
    <div className="p-3 bg-slate-100/70 border-t border-slate-300 space-y-2">
      <div className="space-y-1.5 max-h-36 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-1">コメントはまだありません。</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-center justify-between bg-white p-2 rounded-md border border-slate-200 text-xs text-slate-700 shadow-2xs"
            >
              <p className="break-all pr-2">{comment.text}</p>
              <button
                onClick={() => deleteComment(comment.id)}
                className="text-slate-300 hover:text-red-500 p-1 rounded transition flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addComment} className="flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="コメントを入力..."
          className="flex-1 px-3 py-2 border border-slate-300 rounded-md bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  );
}
