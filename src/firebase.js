// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAwASytfUZXFqF3TOKU6NCdFM5HV2egrvA",
  authDomain: "vanshavali-63059712-90741.firebaseapp.com",
  databaseURL: "https://vanshavali-63059712-90741-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vanshavali-63059712-90741",
  storageBucket: "vanshavali-63059712-90741.firebasestorage.app",
  messagingSenderId: "638181844233",
  appId: "1:638181844233:web:dabd0c873ef503e1ca1fd8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
export const database = getDatabase(app);

// Get a reference to the auth service
export const auth = getAuth(app);
