# Spherify
  Spherify is a Team Collaboration and Project Management Platform aim to help Software Developers. The system main features include **team management**, **text chats**, **video and audio conferencing**, **file sharing**, **live code editting**, and project management tools like **kanban board**, **project calendar** and **gant chart**. Spherify aims to improve the productivity and performance of the team by integrating these necessary tools and eliminating the hassle of switching to another application to do another task. Through this system, software developers will be able to focus more on their project and reduce the mental load caused by using of multiple application to met project goals and tasks.

## Installatiom
1. Clone the repository
   ```
   git clone https://github.com/cbsdan-tup/spherify.git
   ```
3. Install node modules
   Make sure the current directory is 'Spherify' or this repository.
   ```
   cd backend
   npm install
   cd ../frontend
   npm install
   ```
4. Create **firebase-adminsdk.json** inside **config/** directory
   copy this code and paste inside firebase-adminsdk.json
   ```
   {
    "type": "service_account",
    "project_id": "spherify-d19a5",
    "private_key_id": "4f26c438eefb5ebd45bd5107e0fe2e08ef348457",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD7IZyNqjbZ3ABQ\nJxEoDXS1Ra69C5kgimeljel1/+mBrryyAZRk2T/mnybj1h+F8KKTNfeL857Rimc0\nRoF5HvnOsuFre9gXGgHkfuQBWabHKj15lLvcJXFkYjFRVEqa49KAVy915Zlzjze3\nPyB3xW3qULg41VRVnZsL9zXrp/H/hXlDpMPRHjzhiXwgdlIv7AcLc1lfUG6GwIGp\n5Hf4KoSXYQUdTjlJOY84GT7Hc3/PVFCU+MbRY/EK6e9tIiaisf+rOOn/E4wkJYEj\nEO1B4hQeLZhzjqytEPLZuFIzouKwUgyaKAu8/UNCDh9PMTxYu6Ue5sgsfe1tlKLz\nMGRs0PWxAgMBAAECggEAFyORL7JjzG4Lb1cyKv0WaE9r2spTSR7HjwcE4FT8mHDX\nvRUNLb+gtiiq5ipIDEjQSf0aeoAvfYIhoTzv2A+lF8j+oS8viW1hiEKy0ncGuWoo\ncOfl6VJf4M51WdeI6j2cmyutWVEW8wFasl00KiT8TC800jPBygO0EgWsp7J5R0A/\n4qxgbm2wrjJpzht86jq5oQ7V6YcB5B2mgHVAO+ZobUGxyYjQqaFCcx65YakYG7xu\n3/TsHo8MkTrY/eNdXuTaEAF+2VkAUweUzZ/3vXGPdXmMgJM0dJNpGGrgMQuwGd4D\nkKMXmKMz4VtGJlmBfSn2DCatOliU4Nup1oY5s57oswKBgQD/d9q8eeBEg6JhvVeC\nQgymqM5Fv5JI3ozIu+KcXlIyHrWkx0ZLR16rYvduMLEQEoko+CdxfTuf4h0Mqrt8\nR8TWaNaIRIsqzqv/jLoQtMMCU0gxPuXXyHFiXA8+gtv24GBWQNqHf9SXxwQiQMqv\n+jVb0eD77Dgern8+Ep07n63r4wKBgQD7p3Ij4XGEdvQ5YHVRSYYZcnWjaUThdcWY\n6su2M9Zmicqu0ezJ7obBIzyhHJ8hrMmv+sXXVSr2GuYEMuFNWgFoDULo7ok99En3\nu3yZNg0emCDR+KmNEIzBUMl2OBA8h4IRo6gE6wcdHe8RUM4gEKBkeJhGxUXRvOCV\nTh6xFdw0WwKBgAymNZlxe25JCkhGpMeZV6EE6LnBY4/iHRxvWSge73j11k6jY1Kk\n5QYdb1zwYkQGdu4lY2aWKdafzoprBb+Amjl3lW/H3RAwjYmowSnEmYdK8l8l2yGV\nFjAlmMeimRufPoXmzis5ZCBjxUug46hU/kFeogI3TwwN3dUH/OsP2/+7AoGALvM/\njUgrSJ501BuV57OC7E55eiJSsompcu0jUnv7XSgKA3Gw7r+srm3nittvKPY2rrln\nndQK7t132oKvnCHVr1cCC7ktK7ze6/Qzu9Xkvrd9MA9neqUCzbJH0+GDzfcuIiJZ\nX4mFyz3hc2aS/lJ7yiLhrhpx+z503AY2Ha3JZo8CgYEAnThZlJUCz3EzXmnT1ny1\n5O40P6pckztVTwkSN9eNRvKdZ0CCVTf3M2Ke0S8xiBU+AnEtwAtGck9c520Y7pwE\nCN7u8DP/nv15vpxqNAUdDdg1zV08W0oeufj3XwqFDnVGhOoE/5Rv18SHDBM+Eu0k\nKwAd5CsugEwv3+n7q/lSeks=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-fbsvc@spherify-d19a5.iam.gserviceaccount.com",
    "client_id": "102588216861885303644",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40spherify-d19a5.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"}
   ```
5. Run the application
   ```
   cd backend
   npm start
   cd ../frontend
   npm run dev
   ```
   
## Technologies Used
- MERN (MongoDB, Express, React.js and Node.js)
- Firebase (Authentication)
- Cloudinary (Photos)
  
## Developers
- Cabasa, Daniel O.
- Lebosada, Jury Andrew
- Esquivel, Cassley Ann Mina
- Diaz, Romel Jan
