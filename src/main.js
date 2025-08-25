import { createApp } from "vue";
import App from "./App.vue";
import Head from "@components/head.vue";
import Navigation from "@components/navigation.vue";
import RouteAnnouncer from "@components/routeAnnouncer.vue";
import Toaster from "@components/toaster.vue";
import Form from "@components/form.vue";
import router from "@router";
import firebaseClient, {client} from "@composables/client";
const firebaseConfig = {
apiKey: "AIzaSyBYoahezGGpH2dYljh65B-3h9CYUuz1h4Y",
authDomain: "saint-josephs-academy.firebaseapp.com",
projectId: "saint-josephs-academy",
storageBucket: "saint-josephs-academy.firebasestorage.app",
messagingSenderId: "437000501544",
appId: "1:437000501544:web:9c6ed29c001a99e20f381d"
};
const app = createApp(App);
app.use(router);
app.component("Head", Head);
app.component("Navigation", Navigation);
app.component("RouteAnnouncer", RouteAnnouncer);
app.component("Toaster", Toaster);
app.component("Form", Form);
app.mount('#app');
const firebaseApp = new firebaseClient(firebaseConfig);
client.auth = firebaseApp.auth;
client.firestore = firebaseApp.firestore;
client.session = firebaseApp.session;
