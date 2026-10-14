import type { NextConfig } from "next";



const nextConfig: NextConfig = {

  // firebase-admin をサーバー専用の外部パッケージとして扱い、ビルドエラーを防ぐ

  serverExternalPackages: ["firebase-admin"],

};



export default nextConfig;
