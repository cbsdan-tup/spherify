// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
// Replace 10.13.2 with latest version of the Firebase JS SDK.
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyC0k4vq9q1haAKlYHyfEEMKrOFZ_xh6K5Y",
  authDomain: "spherify-d19a5.firebaseapp.com",
  projectId: "spherify-d19a5",
  storageBucket: "spherify-d19a5.firebasestorage.app",
  messagingSenderId: "1067425363363",
  appId: "1:1067425363363:web:7171214f84476885371616",
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/images/white-logo.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
