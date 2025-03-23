const admin = require('firebase-admin');

// Function to build Firebase service account from individual environment variables
function buildServiceAccountCredentials() {
  try {
    // Check for required environment variables
    const requiredVars = [
      'FIREBASE_TYPE', 
      'FIREBASE_PROJECT_ID', 
      'FIREBASE_PRIVATE_KEY_ID',
      'FIREBASE_PRIVATE_KEY', 
      'FIREBASE_CLIENT_EMAIL'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Missing required Firebase credentials in production environment');
      } else {
        console.warn('Using fallback credentials for development. Push notifications will not work correctly.');
      }
    }
    
    // Build service account object from environment variables
    const serviceAccount = {
      type: process.env.FIREBASE_TYPE || 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID || 'firebase-fallback',
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || 'fallback-key-id',
      // When stored in env vars, private keys often need newlines to be fixed
      private_key: (process.env.FIREBASE_PRIVATE_KEY || 'fallback-key').replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL || 'fallback@example.com',
      client_id: process.env.FIREBASE_CLIENT_ID || 'fallback-client-id',
      auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || '',
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
    };
    
    return serviceAccount;
  } catch (error) {
    console.error('Error building Firebase credentials:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      throw error; // Re-throw in production
    } else {
      // Return minimal service account for development to avoid crashes
      return {
        type: 'service_account',
        project_id: 'firebase-fallback-dev',
        private_key_id: 'development-key-id',
        private_key: 'INVALID-DEVELOPMENT-KEY',
        client_email: 'example@firebase-dev.com'
      };
    }
  }
}

// Build service account from environment variables
const serviceAccount = buildServiceAccountCredentials();

// Initialize the Firebase admin app
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error.message);
  
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Push notifications will not be available in development mode');
  } else {
    // In production, we might want to exit the process or handle differently
    throw error;
  }
}

module.exports = admin;