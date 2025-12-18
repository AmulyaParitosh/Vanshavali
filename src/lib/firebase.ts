import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAwASytfUZXFqF3TOKU6NCdFM5HV2egrvA",
    authDomain: "vanshavali-63059712-90741.firebaseapp.com",
    databaseURL: "https://vanshavali-63059712-90741-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vanshavali-63059712-90741",
    storageBucket: "vanshavali-63059712-90741.firebasestorage.app",
    messagingSenderId: "638181844233",
    appId: "1:638181844233:web:dabd0c873ef503e1ca1fd8"
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
