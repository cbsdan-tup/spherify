// sendNotification.js
const { google } = require('googleapis'); 
const axios = require("axios");

// Build service account from individual environment variables
const buildServiceAccountCredentials = () => {
  return {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID || 'spherify-d19a5',
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
  };
};

const getFirebaseAccessToken = async () => {
  try {
    const serviceAccount = buildServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: 'https://www.googleapis.com/auth/firebase.messaging',
    });
    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    return accessToken.token;
  } catch (error) {
    console.error('Error getting Firebase access token:', error.message);
    throw new Error('Failed to get Firebase access token');
  }
};

const sendNotification = async (permissionToken, notificationData) => {
  try {
    if (!permissionToken) {
      throw new Error('Permission token is required');
    }
    
    const accessToken = await getFirebaseAccessToken();
    const projectId = process.env.FIREBASE_PROJECT_ID || 'spherify-d19a5';
    
    const message = {
      message: {
        token: permissionToken,
        notification: {
          title: notificationData.title || 'New Notification',
          body: notificationData.body || '',
        },
        webpush: {
          fcm_options: {
            link: notificationData.url || 'https://spherify.vercel.app/', 
          },
          notification: {
            icon: notificationData.image || undefined,
            tag: notificationData.tag || '/images/white-logo.png',
          }
        },
      },
    };

    console.log('Sending FCM notification with payload:', JSON.stringify(message, null, 2));

    const response = await axios.post(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      message,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log('Notification sent successfully:', response.data);
    return response.data;  
  } catch (error) {
    console.error('Error sending notification:', error.message);
    if (error.response) {
      console.error('FCM API Response Error:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    // Don't throw in non-production environments to prevent app failures
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to send notification');
    } else {
      console.warn('Notification not sent in development environment');
      return null;
    }
  }
};

module.exports = sendNotification;
