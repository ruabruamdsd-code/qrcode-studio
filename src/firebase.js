import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // ดึงระบบฐานข้อมูลมาใช้

const firebaseConfig = {
  apiKey: "AIzaSyD4tI1h8cxJF8b3Rv9_gZN7wwC6qv-nf8",
  authDomain: "qrcode-33a0c.firebaseapp.com",
  projectId: "qrcode-33a0c",
  storageBucket: "qrcode-33a0c.firebasestorage.app",
  messagingSenderId: "452271941747",
  appId: "1:452271941747:web:0da127bf47e102e794a206",
  measurementId: "G-KS97QLB4Z4"
};

// เริ่มต้นเปิดระบบ Firebase
const app = initializeApp(firebaseConfig);

// เปิดระบบฐานข้อมูลและส่งออกไปให้ไฟล์ App.jsx ใช้งาน
export const db = getFirestore(app);