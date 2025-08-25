import {reactive} from "vue";
import {initializeApp} from "firebase/app";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
import EventEmitter from "eventemitter3";
export const client = reactive({auth: null, firestore: null, session: null});
class firebaseClient extends EventEmitter {
constructor(firebaseConfig) {
super();
this.firebaseConfig = firebaseConfig;
this.app = initializeApp(this.firebaseConfig);
this.auth = getAuth(this.app);
this.firestore = getFirestore(this.app);
this.session = false;
client.auth = this.auth;
client.firestore = this.firestore;
client.session = this.session;
onAuthStateChanged(this.auth, (user) => {
if (user) {
this.session = user;
client.session = user;
console.log("Login");
this.emit("login", user);
} else {
this.emit("logout", null);
this.session = false;
client.session = false;
console.log("logout");
}
});

}

}
export default firebaseClient;