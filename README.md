# HearMe - Audio Captioning & Sign Language Platform

A React-based web application that provides real-time audio captioning and sign language resources for deaf and hard-of-hearing users. Built with Firebase for backend services and real-time data synchronization.

## Features

- **Audio Recording & Captioning** - Record audio and receive real-time captions
- **Sign Phrase Bank** - Access a community-driven database of sign language phrases
- **User Profiles** - Manage personal preferences and settings
- **Community Dashboard** - Connect and interact with other users
- **Admin Dashboard** - Manage platform content and moderation
- **Authentication** - Secure login with Firebase authentication

## Tech Stack

- **React 19** - UI framework
- **Firebase** - Backend, authentication, and Firestore database
- **React Router** - Navigation
- **React Icons** - Icon library

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn
- Firebase project setup

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/lance15bolo-hue/hearme.git
   cd hearme
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with your Firebase credentials:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

### Available Scripts

#### `npm start`

Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser. The page will reload when you make changes.

#### `npm test`

Launches the test runner in interactive watch mode.

#### `npm run build`

Builds the app for production to the `build` folder. The build is optimized for best performance.

## Project Structure

```
src/
├── components/         # React components
│   ├── AdminDashboard.js
│   ├── CaptioningPanel.js
│   ├── Community.js
│   ├── Recorder.js
│   ├── SignPhraseBank.js
│   └── ...
├── App.js             # Main app component
├── firebase.js        # Firebase configuration
└── index.js           # Entry point
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private. All rights reserved.
