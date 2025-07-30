const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = 3000;
app.use(cors());
app.use(bodyParser.json());
const userNotes = new Map();

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

app.get('/notes', verifyToken, (req, res) => {
  const uid = req.user.uid;
  const notes = userNotes.get(uid) || [];
  res.json({ notes });
});

app.post('/notes', verifyToken, (req, res) => {
  const uid = req.user.uid;
  const { notes } = req.body;

  if (!Array.isArray(notes)) {
    return res.status(400).send('Invalid notes format');
  }

  userNotes.set(uid, notes);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});



