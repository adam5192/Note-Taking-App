# 📝 Notely – A Simple Note-Taking App

Live Demo: [https://adam5192.github.io/Note-Taking-App/](https://adam5192.github.io/Note-Taking-App/)

Notely is a clean and responsive web app for taking and organizing notes with tags.

## Features

- Google sign-in with Firebase
- Create, edit, delete, and tag notes
- Filter notes by tags
- Drag-and-drop reordering
- Light/dark theme toggle
- Data is saved in MongoDB and synced with backend

## Technologies Used

**Frontend:** HTML, CSS, JavaScript, Firebase Auth  
**Backend:** Node.js, Express, MongoDB (with Mongoose)  
**Hosting:** GitHub Pages (frontend), Render (backend)

<img width="1067" height="1311" alt="image" src="https://github.com/user-attachments/assets/801eabb7-e969-42c9-872c-c2775caa923c" />


## Running Locally

1. Clone the repo

```
git clone https://github.com/adam5192/Note-Taking-App.git
```

2. Install backend dependencies

```
cd backend
npm install
```

3. Create a `.env` file with:

```
MONGO_URI=your_mongo_uri
FIREBASE_SERVICE_ACCOUNT=your_service_account_json_string
```

4. Run the server

```
node server.js
```

5. Open the frontend from the `frontend` folder in your browser or use Live Server.

## Author

Created by Adam Mokdad.
