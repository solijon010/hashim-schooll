import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCAXfTwBQyViKTDsP3OSO4K3N8DC7p5oGI",
  authDomain: "hashim-school.firebaseapp.com",
  projectId: "hashim-school",
  storageBucket: "hashim-school.firebasestorage.app",
  messagingSenderId: "460858426525",
  appId: "1:460858426525:web:0c9e126cc9bdf70fbec074"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
