"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
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
  X,
  Pencil,
  Check,
} from "lucide-react";

// 店舗カテゴリーの定義
const STORES = [
  "すべて",
  "サミット",
  "まいばすけっと",
  "ドラッグストア",
  "100均",
  "AVE",
  "その他",
] as const;

// 優先度の定義
const PRIORITIES = ["高", "中", "低"] as const;

// 優先度の重み付け（並び替え用）
const PRIORITY_WEIGHT: Record<string, number> = {
  高: 3,
  中: 2,
  低: 1,
};

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

  // 期限の編集状態管理
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string>("");

  // 日付の入力文字列を 自動で YYYY/MM/DD フォーマットに整形する関数
  const formatDateInput = (value: string) => {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 4) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
    return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
  };

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

      // 期限（昇順） ＞ 優先度（高→中→低） の順でソート
      list.sort((a, b) => {
        const dateA = a.dueDate || "";
        const dateB = b.dueDate || "";

        if (dateA !== dateB) {
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA.localeCompare(dateB);
        }

        const weightA = PRIORITY_WEIGHT[a.priority || "中"] || 2;
        const weightB = PRIORITY_WEIGHT[b.priority || "中"] || 2;
        return weightB - weightA;
      });

      setItems(list);
    });

    return () => unsubscribe();
  }, []);

  // 日付ショートカット計算用関数
  const setShortcutDate = (daysToAdd: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    setDueDate(`${yyyy}/${mm}/${dd}`);
  };

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

  // 🔥 後から優先度を変更する関数
  const updatePriority = async (id: string, newPriority: string) => {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, {
      priority: newPriority,
    });
  };

  // 期限（日付）の修正・保存
  const startEditingDueDate = (id: string, currentDueDate: string) => {
    setEditingId(id);
    setEditingDueDate(currentDueDate || "");
  };

  const saveDueDate = async (id: string) => {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, {
      dueDate: editingDueDate.trim(),
    });
    setEditingId(null);
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
    <main className="w-full min-h-screen bg-slate-50 p-2 sm:p-6 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center gap-2 mb-4 pt-2">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            買い物リスト
          </h1>
        </header>

        {/* 登録フォーム */}
        <form
          onSubmit={addItem}
          className="bg-white p-3 sm:p-4 rounded-xl border border-slate-300 shadow-xs mb-4 space-y-3"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="買うものを入力..."
              className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-xs active:scale-95 transition flex items-center justify-center min-w-[50px]"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* 店名タグ */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <Store className="w-4 h-4 text-slate-400 flex-shrink-0 mr-0.5" />
            {STORES.filter((s) => s !== "すべて").map((storeName) => (
              <button
                key={storeName}
                type="button"
                onClick={() =>
                  setSelectedStore(selectedStore === storeName ? null : storeName)
                }
                className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition border ${
                  selectedStore === storeName
                    ? "bg-emerald-600 text-white font-medium border-emerald-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {storeName}
              </button>
            ))}
          </div>

          {/* 優先度選択 */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> 優先度:
            </span>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className={`px-2.5 py-0.5 rounded font-medium border transition ${
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

          {/* 期限 */}
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-center gap-1 text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5" /> <span>期限（日付）:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShortcutDate(0)}
                className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 rounded font-medium transition"
              >
                今日
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(1)}
                className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 rounded font-medium transition"
              >
                明日
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(3)}
                className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 rounded font-medium transition"
              >
                3日後
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(7)}
                className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 rounded font-medium transition"
              >
                1週後
              </button>
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="px-2 py-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 border border-slate-200 rounded font-medium transition"
              >
                なし
              </button>

              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="text"
                  inputMode="numeric"
                  value={dueDate}
                  onChange={(e) => setDueDate(formatDateInput(e.target.value))}
                  placeholder="20261001"
                  maxLength={10}
                  className="w-28 px-2 py-1 border border-slate-300 rounded bg-white text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="p-1 text-slate-400 hover:text-red-500 bg-slate-100 hover:bg-red-50 rounded"
                    title="クリア"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* 絞り込みタブ */}
        <div className="mb-3">
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>表示するお店で絞り込み:</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {STORES.map((storeName) => (
              <button
                key={storeName}
                type="button"
                onClick={() => setFilterStore(storeName)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap border transition ${
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
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-800 text-xs font-bold">
                  <th className="py-2.5 px-2 border-r border-slate-800 w-[35%] text-center">
                    必要なもの
                  </th>
                  <th className="py-2.5 px-1 border-r border-slate-800 text-center w-[17%]">
                    お店
                  </th>
                  <th className="py-2.5 px-1 border-r border-slate-800 text-center w-[23%]">
                    優先度
                  </th>
                  <th className="py-2.5 px-1 text-center w-[25%]">期限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
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
                        {/* 1. 必要なもの */}
                        <td className="p-2 border-r border-slate-800 align-middle">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-800 text-sm break-all leading-tight">
                              {item.text}
                            </span>
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                onClick={() => toggleComment(item.id)}
                                className={`flex items-center gap-0.5 text-[11px] p-0.5 rounded transition ${
                                  openCommentId === item.id
                                    ? "text-emerald-700 bg-emerald-100"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title="コメント"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {openCommentId === item.id ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="text-slate-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 2. お店 */}
                        <td className="p-1 border-r border-slate-800 align-middle text-center">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                            {item.store ? item.store.slice(0, 2) : "その"}
                          </span>
                        </td>

                        {/* 3. 🔥 後からワンタップで直接変更できる優先度ボタン */}
                        <td className="p-1 border-r border-slate-800 text-center align-middle">
                          <div className="flex justify-center gap-0.5">
                            {PRIORITIES.map((p) => {
                              const isSelected = (item.priority || "中") === p;
                              return (
                                <button
                                  key={p}
                                  onClick={() => updatePriority(item.id, p)}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold border transition ${
                                    isSelected
                                      ? p === "高"
                                        ? "bg-red-500 text-white border-red-500 shadow-2xs"
                                        : p === "中"
                                        ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                                        : "bg-blue-500 text-white border-blue-500 shadow-2xs"
                                      : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                                  }`}
                                  title={`優先度を「${p}」に変更`}
                                >
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* 4. 期限 */}
                        <td className="p-1 text-center align-middle text-slate-700 font-mono text-[11px] sm:text-xs">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editingDueDate}
                                onChange={(e) => setEditingDueDate(formatDateInput(e.target.value))}
                                maxLength={10}
                                className="w-20 px-1 py-0.5 text-[11px] border border-emerald-500 rounded bg-white text-slate-800 focus:outline-none"
                                placeholder="20261001"
                                autoFocus
                              />
                              <button
                                onClick={() => saveDueDate(item.id)}
                                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                                title="保存"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition"
                                title="キャンセル"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 group">
                              <span>{item.dueDate || "-"}</span>
                              <button
                                onClick={() => startEditingDueDate(item.id, item.dueDate || "")}
                                className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                                title="期限を編集"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* コメントエリア */}
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

// コメント欄コンポーネント
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
    <div className="p-2.5 bg-slate-100/70 border-t border-slate-300 space-y-2">
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-1">コメントはまだありません。</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="flex items-center justify-between bg-white p-1.5 rounded border border-slate-200 text-xs text-slate-700 shadow-2xs"
            >
              <p className="break-all pr-2">{comment.text}</p>
              <button
                onClick={() => deleteComment(comment.id)}
                className="text-slate-300 hover:text-red-500 p-0.5 rounded transition flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addComment} className="flex gap-1.5">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="コメントを入力..."
          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
    </div>
  );
}
