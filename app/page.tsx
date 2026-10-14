"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
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
  getDoc,
  setDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User,
} from "firebase/auth";
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
  LogOut,
  Lock,
  Mail,
  ArrowLeft,
  Users,
  Copy,
} from "lucide-react";

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
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // グループ管理用ステート
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [joinGroupIdInput, setJoinGroupIdInput] = useState("");
  const [copySuccessMessage, setCopySuccessMessage] = useState("");

  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [storeDocs, setStoreDocs] = useState<StoreItem[]>([]);
  const [text, setText] = useState("");

  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>("中");
  const [dueDate, setDueDate] = useState<string>("");
  const [filterStore, setFilterStore] = useState<string>("すべて");
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<string>("");

  const formatDateInput = (value: string) => {
    const nums = value.replace(/\D/g, "");
    if (nums.length <= 4) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 4)}/${nums.slice(4)}`;
    return `${nums.slice(0, 4)}/${nums.slice(4, 6)}/${nums.slice(6, 8)}`;
  };

  // 1. ユーザーのログイン状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        getDoc(userRef).then(async (userSnap) => {
          if (userSnap.exists() && userSnap.data().groupId) {
            setGroupId(userSnap.data().groupId);
          } else {
            const defaultGroupId = currentUser.uid;
            await setDoc(userRef, { groupId: defaultGroupId }, { merge: true });
            setGroupId(defaultGroupId);
          }
        });
      } else {
        setGroupId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // ログイン / 新規登録 処理
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setResetMessage("");
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail("");
      setPassword("");
    } catch (err: any) {
      if (err.code === "auth/invalid-email") {
        setAuthError("無効なメールアドレスの形式です。");
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setAuthError("メールアドレスまたはパスワードが正しくありません。");
      } else if (err.code === "auth/user-not-found") {
        setAuthError("ユーザーが見つかりません。新規登録をお試しください。");
      } else if (err.code === "auth/email-already-in-use") {
        setAuthError("このメールアドレスは既に登録されています。");
      } else if (err.code === "auth/weak-password") {
        setAuthError("パスワードは6文字以上で設定してください。");
      } else {
        setAuthError("認証エラーが発生しました: " + err.message);
      }
    }
  };

  // パスワード再設定メール送信処理
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setResetMessage("");
    if (!email.trim()) {
      setAuthError("メールアドレスを入力してください。");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage(
        "パスワード再設定用のメールを送信しました。メール内のリンクから再設定を行ってください。"
      );
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setAuthError("このメールアドレスは登録されていません。");
      } else if (err.code === "auth/invalid-email") {
        setAuthError("無効なメールアドレスの形式です。");
      } else {
        setAuthError("送信エラーが発生しました: " + err.message);
      }
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    await signOut(auth);
  };

  // グループ参加・切り替え処理
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !joinGroupIdInput.trim()) return;

    const targetGroupId = joinGroupIdInput.trim();
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { groupId: targetGroupId }, { merge: true });
    setGroupId(targetGroupId);
    setJoinGroupIdInput("");
    setIsGroupModalOpen(false);
  };

  // 自分のグループIDに復帰する処理
  const handleResetToMyOwnGroup = async () => {
    if (!user) return;
    const myOwnGroup = user.uid;
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { groupId: myOwnGroup }, { merge: true });
    setGroupId(myOwnGroup);
    setIsGroupModalOpen(false);
  };

  // グループIDコピー機能
  const copyGroupId = () => {
    if (!groupId) return;
    navigator.clipboard.writeText(groupId);
    setCopySuccessMessage("コピーしました！");
    setTimeout(() => setCopySuccessMessage(""), 2000);
  };

  // 2. 店舗一覧取得（自動登録せず空の時は空リスト）
  useEffect(() => {
    if (!user || !groupId) return;
    const q = query(
      collection(db, "groups", groupId, "stores"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: StoreItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
      }));
      setStoreDocs(list);
      setStores(list.map((s) => s.name));
    });

    return () => unsubscribe();
  }, [user, groupId]);

  // 3. 買い物リスト取得
  useEffect(() => {
    if (!user || !groupId) return;
    const q = query(
      collection(db, "groups", groupId, "items"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Item[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        text: doc.data().text || "",
        store: doc.data().store || "その他",
        priority: doc.data().priority || "中",
        dueDate: doc.data().dueDate || "",
      }));

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
  }, [user, groupId]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !newStoreName.trim()) return;
    if (stores.includes(newStoreName.trim())) {
      alert("そのお店は既に登録されています");
      return;
    }

    await addDoc(collection(db, "groups", groupId, "stores"), {
      name: newStoreName.trim(),
      createdAt: serverTimestamp(),
    });
    setNewStoreName("");
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!groupId) return;
    await deleteDoc(doc(db, "groups", groupId, "stores", storeId));
  };

  const setShortcutDate = (daysToAdd: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    setDueDate(`${yyyy}/${mm}/${dd}`);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !text.trim()) return;

    await addDoc(collection(db, "groups", groupId, "items"), {
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

  const deleteItem = async (id: string) => {
    if (!groupId) return;
    await deleteDoc(doc(db, "groups", groupId, "items", id));
  };

  const updatePriority = async (id: string, newPriority: string) => {
    if (!groupId) return;
    const itemRef = doc(db, "groups", groupId, "items", id);
    await updateDoc(itemRef, {
      priority: newPriority,
    });
  };

  const startEditingDueDate = (id: string, currentDueDate: string) => {
    setEditingId(id);
    setEditingDueDate(currentDueDate || "");
  };

  const saveDueDate = async (id: string) => {
    if (!groupId) return;
    const itemRef = doc(db, "groups", groupId, "items", id);
    await updateDoc(itemRef, {
      dueDate: editingDueDate.trim(),
    });
    setEditingId(null);
  };

  const toggleComment = (id: string) => {
    setOpenCommentId(openCommentId === id ? null : id);
  };

  const filteredItems = items.filter((item) => {
    if (filterStore === "すべて") return true;
    return item.store === filterStore;
  });

  if (authLoading) {
    return (
      <main className="w-full min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 font-medium">読み込み中...</div>
      </main>
    );
  }

  // 未ログイン時：ログイン画面
  if (!user) {
    return (
      <main className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md w-full max-w-md space-y-6">
          {isResetPassword ? (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-amber-100 text-amber-600 rounded-2xl mb-1">
                  <Mail className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">
                  パスワードの再設定
                </h1>
                <p className="text-xs text-slate-500">
                  ご登録のメールアドレスを入力してください。<br />
                  再設定用のリンクをお送りします。
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {authError}
                </div>
              )}

              {resetMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium leading-relaxed">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition active:scale-98"
                >
                  再設定メールを送信
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPassword(false);
                    setAuthError("");
                    setResetMessage("");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> ログイン画面に戻る
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-2xl mb-1">
                  <Lock className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {isSignUp ? "アカウント新規作成" : "ログイン"}
                </h1>
                <p className="text-xs text-slate-500">
                  買い物リストを利用するにはログインが必要です
                </p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      パスワード
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
