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
} from "firebase/firestore";
import {
  Trash2,
  Plus,
  ShoppingBag,
  Store,
  Calendar,
  Pencil,
  Check,
  Settings,
} from "lucide-react";

// 優先度の重み付け（並び替え用）
const PRIORITY_WEIGHT: Record<string, number> = {
  高: 3,
  中: 2,
  低: 1,
};

interface Item {
  id: string;
  text: string;
  store?: string;
  priority?: string;
  dueDate?: string;
}

interface StoreItem {
  id: string;
  name: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [storeDocs, setStoreDocs] = useState<StoreItem[]>([]);
  const [text, setText] = useState("");

  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>("中");
  const [dueDate, setDueDate] = useState<string>("");
  const [filterStore, setFilterStore] = useState<string>("すべて");

  // 設定ダイアログの開閉と入力状態
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");

  // 期限の編集状態管理
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string>("");

  // 日付フォーマット整形
  const formatDateInput = (value: string) => {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 4) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
    return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
  };

  // 店舗一覧をリアルタイム取得
  useEffect(() => {
    const q = query(collection(db, "stores"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: StoreItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setStoreDocs(list);
      setStores(list.map((s) => s.name));
    });
    return () => unsubscribe();
  }, []);

  // 買い物リストをリアルタイム取得＆ソート
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

  // 店舗の追加
  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    if (stores.includes(newStoreName.trim())) {
      alert("そのお店は既に登録されています");
      return;
    }
    await addDoc(collection(db, "stores"), {
      name: newStoreName.trim(),
      createdAt: serverTimestamp(),
    });
    setNewStoreName("");
  };

  // 店舗の削除
  const handleDeleteStore = async (storeId: string) => {
    await deleteDoc(doc(db, "stores", storeId));
  };

  // 日付ショートカット
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

  // 優先度の直接変更
  const updatePriority = async (id: string, newPriority: string) => {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, {
      priority: newPriority,
    });
  };

  // 期限の編集開始
  const startEditingDueDate = (id: string, currentDueDate: string) => {
    setEditingId(id);
    setEditingDueDate(currentDueDate || "");
  };

  // 期限の保存
  const saveDueDate = async (id: string) => {
    const itemRef = doc(db, "items", id);
    await updateDoc(itemRef, {
      dueDate: editingDueDate.trim(),
    });
    setEditingId(null);
  };

  // フィルター適用
  const filteredItems = items.filter((item) => {
    if (filterStore === "すべて") return true;
    return item.store === filterStore;
  });

  return (
    <main className="w-full min-h-screen bg-slate-50 p-3 pb-20">
      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-4 pt-2">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-800">買い物リスト</h1>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 transition"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            お店設定
          </button>
        </header>

        {/* 登録フォーム */}
        <form
          onSubmit={addItem}
          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-4 space-y-3"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="買うものを入力..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {/* お店選択 */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">
              買うお店
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                  selectedStore === null
                    ? "bg-slate-800 text-white border-slate-800 font-medium"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ※お店を設定してください
              </button>
              {stores.map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => setSelectedStore(store)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                    selectedStore === store
                      ? "bg-emerald-600 text-white border-emerald-600 font-medium"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          {/* 優先度選択 */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">
              優先度
            </label>
            <div className="flex gap-2">
              {(["高", "中", "低"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className={`flex-1 py-1 text-xs rounded-lg border font-medium transition ${
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

          {/* 期限入力 ＆ ショートカット ＆ クリア */}
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">
              期限 (YYYY/MM/DD)
            </label>
            <div className="flex gap-2 items-center mb-1.5">
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(formatDateInput(e.target.value))}
                placeholder="例: 2026/06/15"
                maxLength={10}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setDueDate("")}
                className="px-2.5 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs rounded-lg border border-slate-200 font-medium"
                title="未選択（-）にする"
              >
                - クリア
              </button>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShortcutDate(0)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] rounded border border-slate-200"
              >
                今日
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(1)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] rounded border border-slate-200"
              >
                明日
              </button>
              <button
                type="button"
                onClick={() => setShortcutDate(2)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] rounded border border-slate-200"
              >
                明後日
              </button>
            </div>
          </div>

          {/* 登録ボタン */}
          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-xl shadow-sm hover:bg-emerald-700 active:scale-95 transition flex items-center justify-center gap-1 text-sm mt-2"
          >
            <Plus className="w-4 h-4" />
            リストに追加
          </button>
        </form>

        {/* 店舗絞り込みフィルター */}
        <div className="mb-4 overflow-x-auto pb-1">
          <div className="flex gap-1.5 min-w-max">
            <button
              onClick={() => setFilterStore("すべて")}
              className={`px-3 py-1.5 text-xs rounded-xl border transition font-medium ${
                filterStore === "すべて"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              すべて ({items.length})
            </button>
            {stores.map((store) => {
              const count = items.filter((i) => i.store === store).length;
              return (
                <button
                  key={store}
                  onClick={() => setFilterStore(store)}
                  className={`px-3 py-1.5 text-xs rounded-xl border transition font-medium ${
                    filterStore === store
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {store} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* リスト一覧 */}
        <div className="space-y-2.5">
          {filteredItems.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm bg-white rounded-xl border border-slate-200">
              該当するアイテムはありません 🎉
            </p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2"
              >
                {/* 品名とメタ情報 */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium text-sm break-all leading-snug mb-1">
                    {item.text}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 border border-slate-200 font-mono">
                      {item.store ? item.store.slice(0, 2) : "その他"}
                    </span>

                    {editingId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingDueDate}
                          onChange={(e) =>
                            setEditingDueDate(formatDateInput(e.target.value))
                          }
                          placeholder="YYYY/MM/DD"
                          className="w-24 px-1.5 py-0.5 border border-emerald-500 rounded text-xs bg-white text-slate-800 focus:outline-none"
                        />
                        <button
                          onClick={() => saveDueDate(item.id)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          startEditingDueDate(item.id, item.dueDate || "")
                        }
                        className="flex items-center gap-1 hover:text-slate-800 transition"
                      >
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{item.dueDate || "-"}</span>
                        <Pencil className="w-2.5 h-2.5 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 優先度変更バッジ */}
                <div className="flex items-center gap-1.5">
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    {(["高", "中", "低"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => updatePriority(item.id, p)}
                        className={`px-2 py-1 text-[11px] font-medium transition ${
                          item.priority === p
                            ? p === "高"
                              ? "bg-red-500 text-white"
                              : p === "中"
                              ? "bg-amber-500 text-white"
                              : "bg-blue-500 text-white"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* お店設定モーダル */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  お店の追加・削除
                </h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1"
                >
                  ✕ 閉じる
                </button>
              </div>

              <form onSubmit={handleAddStore} className="flex gap-2">
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder="新しいお店の名前..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition"
                >
                  追加
                </button>
              </form>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {storeDocs.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm"
                  >
                    <span className="text-slate-700 font-medium">
                      {store.name}
                    </span>
                    <button
                      onClick={() => handleDeleteStore(store.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded transition"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
