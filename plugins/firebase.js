
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
    apiKey: "AIzaSyDvZMzd_8HpUJdTMlx5iAXXJ5-XTO7UVzA",
    authDomain: "joinitfun.firebaseapp.com",
    databaseURL: "https://joinitfun-default-rtdb.firebaseio.com",
    projectId: "joinitfun",
    storageBucket: "joinitfun.appspot.com",
    messagingSenderId: "522237312109",
    appId: "1:522237312109:web:0e6b399d3c8f1494c11364",
    measurementId: "G-HKNVFV53S0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore()
export { db }