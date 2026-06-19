// ============================================================
// CONFIGURAZIONE FIREBASE - Ordine Colazione Hotel
// ============================================================

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB61V1JR7F5GX1kfraqLn98uVcXNjjAwOo",
  authDomain: "ordine-97777.firebaseapp.com",
  projectId: "ordine-97777",
  storageBucket: "ordine-97777.firebasestorage.app",
  messagingSenderId: "47723451358",
  appId: "1:47723451358:web:567df2bb7ca7aa0a71434f"
};

// ============================================================
// INIZIALIZZAZIONE FIREBASE (versione compat)
// ============================================================

let db = null;
let firebaseInitialized = false;

/**
 * Inizializza Firebase se la configurazione è valida
 * @returns {boolean} true se inizializzato con successo
 */
function initializeFirebase() {
  try {
    // Verifica se Firebase è già stato inizializzato
    if (firebase.apps.length > 0) {
      console.log("ℹ️ Firebase già inizializzato");
      db = firebase.firestore();
    } else {
      // Inizializza Firebase
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
    }
    
    // Abilita persistenza offline
    db.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn("⚠️ Persistenza offline non disponibile (più tab aperte)");
        } else if (err.code === 'unimplemented') {
          console.warn("⚠️ Persistenza offline non supportata da questo browser");
        } else {
          console.warn("⚠️ Errore persistenza offline:", err);
        }
      });

    firebaseInitialized = true;
    console.log("✅ Firebase inizializzato con successo!");
    console.log("📁 Progetto:", firebaseConfig.projectId);
    return true;
    
  } catch (error) {
    console.error("❌ Errore inizializzazione Firebase:", error);
    return false;
  }
}

/**
 * Verifica se Firebase è pronto
 * @returns {boolean}
 */
function isFirebaseReady() {
  return firebaseInitialized && db !== null;
}

/**
 * Ottieni riferimento al database Firestore
 * @returns {firebase.firestore.Firestore|null}
 */
function getFirestore() {
  return db;
}

/**
 * Test di connessione a Firebase
 */
async function testFirebaseConnection() {
  if (!isFirebaseReady()) {
    console.warn("⚠️ Firebase non pronto");
    return false;
  }
  
  try {
    // Prova a leggere un documento di test
    const testDoc = db.collection('_test').doc('connection');
    await testDoc.set({ timestamp: new Date().toISOString() });
    console.log("✅ Connessione Firebase funzionante!");
    return true;
  } catch (error) {
    console.error("❌ Test connessione fallito:", error);
    return false;
  }
}

// ============================================================
// COLLEZIONI FIRESTORE
// ============================================================

const COLLECTIONS = {
  // Stato corrente degli articoli (selezioni, quantità, note)
  CURRENT_ORDER: "currentOrder",
  
  // Articoli extra aggiunti dall'utente
  EXTRA_ITEMS: "extraItems",
  
  // Storico ordini salvati
  ORDER_HISTORY: "orderHistory",
  
  // Impostazioni app
  SETTINGS: "settings"
};

// ============================================================
// FUNZIONI UTILITY PER FIRESTORE
// ============================================================

/**
 * Salva un documento in una collezione
 * @param {string} collection - Nome della collezione
 * @param {string} docId - ID del documento (opzionale)
 * @param {object} data - Dati da salvare
 */
async function saveToFirestore(collection, docId, data) {
  if (!isFirebaseReady()) {
    console.warn("⚠️ Firebase non pronto, salvataggio locale");
    return null;
  }
  
  try {
    const docRef = docId 
      ? db.collection(collection).doc(docId)
      : db.collection(collection).doc();
    
    await docRef.set(data, { merge: true });
    console.log(`✅ Dati salvati in ${collection}/${docId || docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Errore salvataggio in ${collection}:`, error);
    return null;
  }
}

/**
 * Legge un documento da Firestore
 * @param {string} collection - Nome della collezione
 * @param {string} docId - ID del documento
 * @returns {Promise<object|null>}
 */
async function readFromFirestore(collection, docId) {
  if (!isFirebaseReady()) {
    console.warn("⚠️ Firebase non pronto, lettura locale");
    return null;
  }
  
  try {
    const doc = await db.collection(collection).doc(docId).get();
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error(`❌ Errore lettura da ${collection}:`, error);
    return null;
  }
}

/**
 * Legge tutti i documenti di una collezione
 * @param {string} collection - Nome della collezione
 * @returns {Promise<Array>}
 */
async function readAllFromFirestore(collection) {
  if (!isFirebaseReady()) {
    console.warn("⚠️ Firebase non pronto, lettura locale");
    return [];
  }
  
  try {
    const snapshot = await db.collection(collection).get();
    const results = [];
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  } catch (error) {
    console.error(`❌ Errore lettura collezione ${collection}:`, error);
    return [];
  }
}

// ============================================================
// ESPORTA FUNZIONI (per uso globale)
// ============================================================

// Rendi disponibili le funzioni globalmente
window.firebaseConfig = firebaseConfig;
window.initializeFirebase = initializeFirebase;
window.isFirebaseReady = isFirebaseReady;
window.getFirestore = getFirestore;
window.COLLECTIONS = COLLECTIONS;
window.saveToFirestore = saveToFirestore;
window.readFromFirestore = readFromFirestore;
window.readAllFromFirestore = readAllFromFirestore;
window.testFirebaseConnection = testFirebaseConnection;

// ============================================================
// INIZIALIZZAZIONE AUTOMATICA
// ============================================================

console.log("🔥 Caricamento Firebase...");

// Attendi che Firebase sia caricato
if (typeof firebase !== 'undefined') {
  // Inizializza Firebase
  const initResult = initializeFirebase();
  
  if (initResult) {
    // Test connessione dopo 1 secondo
    setTimeout(() => {
      testFirebaseConnection();
    }, 1000);
  }
} else {
  console.error("❌ Firebase non caricato! Verifica la connessione a internet.");
}

console.log("✅ firebase-config.js caricato");
