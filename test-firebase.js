import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
try {
  const app = initializeApp({ apiKey: "" });
  getAuth(app);
  console.log("Empty key OK");
} catch(e) {
  console.error("Empty key:", e.message);
}

try {
  const app = initializeApp({ apiKey: "invalid-key-but-not-empty" }, "test2");
  getAuth(app);
  console.log("Invalid key OK");
} catch(e) {
  console.error("Invalid key:", e.message);
}
