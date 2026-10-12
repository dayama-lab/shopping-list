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
  Settings,
} from "lucide-react";

// デフォルトの店舗リスト
const DEFAULT_STORES = [
  "サミット",
  "まいばすけっと",
  "ドラッグストア",
  "100均",
  "AVE",
  "その他",
];

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

interface StoreItem {
  id: string;
  name: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [storeDocs, setStoreDocs] = useState<StoreItem[]>([]);
  const [text, setText] = useState("");
  
  // 初期値を null（未選択）に設定
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>("中");
  const [dueDate, setDueDate] = useState<string>("");
  const [filterStore, setFilterStore] = useState<string>("すべて");
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);

  // 設定ダイアログの開閉と入力状態
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");

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

  // Firestoreから店舗一覧をリアルタイム取得（初期データなしの場合はデフォルト登録）
  useEffect(() => {
    const q = query(collection(db, "stores"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        for (let i = 0; i < DEFAULT_STORES.length; i++) {
          await addDoc(collection(db, "stores"), {
            name: DEFAULT_STORES[i],
            createdAt: serverTimestamp(),
          });
        }
      } else {
        const list: StoreItem[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setStoreDocs(list);
        setStores(list.map((s) => s.name));
      }
    });

    return () => unsubscribe();
  }, []);

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

  // 店舗の追加（設定ダイアログ内）
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

  // 店舗の削除（設定ダイアログ内）
  const handleDeleteStore = async (storeId: string) => {
    await deleteDoc(doc(db, "stores", storeId));
  };

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
      store: selectedStore || "その他", // 未選択時は「その他」として保存
      priority: selectedPriority,
      dueDate: dueDate || "",
      createdAt: serverTimestamp(),
    });

    // 登録完了後に初期化（お店選択も未選択 null に戻る）
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
        {/* ヘッダー（設定ボタン付き） */}
        <header className="flex items-center justify-between mb-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <ShoppingBag className
