// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const db = getFirestore(app, {})
export { db }