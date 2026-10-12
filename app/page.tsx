"use client";

import React, { useState, useEffect } from "react";

// ... 前後のコード ...

export default function Home() {
  // 店舗選択の初期値を null（未選択）に設定
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // ... 前後のコード ...

  // アイテム追加処理
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    await addDoc(collection(db, "items"), {
      text: text.trim(),
      store: selectedStore || "その他", // 未選択の場合は「その他」として保存
      priority: selectedPriority,
      dueDate: dueDate || "",
      createdAt: serverTimestamp(),
    });

    // 登録完了後に初期化（未選択状態に戻す）
    setText("");
    setSelectedStore(null); // ← ここで未選択に戻る
    setSelectedPriority("中");
    setDueDate("");
  };

  return (
    // ... 前後のコード ...

    {/* 店名タグ選択エリア */}
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <Store className="w-4 h-4 text-slate-400 flex-shrink-0 mr-0.5" />
        
        {/* 未選択時の案内タグ・メッセージ */}
        {!selectedStore && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium animate-pulse">
            ※お店を設定してください
          </span>
        )}

        {/* 登録されている店舗ボタン一覧 */}
        {stores.map((storeName) => (
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
    </div>

    // ... 以降のコード ...
  );
}
