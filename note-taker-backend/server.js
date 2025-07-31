const express = require('express');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

dotenv.config();


const MONGO_URI = process.env.MONGO_URI;


mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

const noteSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: String,
  content: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now }
});

const Note = mongoose.model('Note', noteSchema);
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const app = express();
const PORT = 3000;
app.use(cors());
app.use(bodyParser.json());
const userNotes = new Map();


app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});


async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split('Bearer ')[1];

  if (!token) return res.status(401).send('Missing token');

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).send('Invalid token');
  }
}

app.get('/notes', verifyToken, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.uid }).sort({ createdAt: -1 });
    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});


app.post('/notes', verifyToken, async (req, res) => {
  try {
    const notes = req.body.notes;
    if (!Array.isArray(notes)) {
      return res.status(400).json({ error: 'Invalid notes format' });
    }

    // Delete old notes for this user
    await Note.deleteMany({ userId: req.user.uid });

    // Save new notes
    const newNotes = notes.map(note => ({
      ...note,
      userId: req.user.uid
    }));

    await Note.insertMany(newNotes);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});


