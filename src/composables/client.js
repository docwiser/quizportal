import {reactive} from "vue";
import {initializeApp} from "firebase/app";
import {getAuth, onAuthStateChanged} from "firebase/auth";
import {getFirestore, doc, getDoc} from "firebase/firestore";
import { getMessaging} from "firebase/messaging";
import EventEmitter from "eventemitter3";
export const client = reactive({auth: null, firestore: null, session: null, vapidKey: "BLnZYY9fjCPnI3EGlQSafNbUNUbCBen5x4Sgmlm9pmEtK0UNevd9H52i_GQ06Q8vXJg_e-PdLUA1sYDk2CADlDk", loading: true});
class firebaseClient extends EventEmitter {
constructor(firebaseConfig) {
super();
this.firebaseConfig = firebaseConfig;
this.app = initializeApp(this.firebaseConfig);
this.auth = getAuth(this.app);
this.firestore = getFirestore(this.app);
this.messaging = getMessaging(this.app);
this.session = false;
this.loading = true;
client.auth = this.auth;
client.firestore = this.firestore;
client.messaging = this.messaging;
client.session = this.session;
client.loading = this.loading;
onAuthStateChanged(this.auth, async (user) => {
this.loading = false;
client.loading = this.loading;
if (user) {
try {
const userDocRef = doc(this.firestore, 'users', user.uid);
const userDoc = await getDoc(userDocRef);
let userData = {
uid: user.uid,
displayName: user.displayName,
email: user.email,
photoURL: user.photoURL,
role_num: 1,
};
if (userDoc.exists()) {
userData = { ...userData, ...userDoc.data() };
}
this.session = userData;
client.session = userData;
} catch (error) {
console.error("Error fetching user data:", error);
this.session = {
uid: user.uid,
displayName: user.displayName,
email: user.email,
photoURL: user.photoURL,
role_num: 1,
batch_id: null
};
client.session = this.session;
}
console.log("Login");
this.emit("login", this.session);
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