import { initializeApp } from 'firebase/app';
import { getFirestore, getDocFromServer, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    console.log("testing connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("success");
  } catch (e) {
    console.error(e);
  }
}
test();
