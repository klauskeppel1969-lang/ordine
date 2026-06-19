// ============================================================
// APP.JS - Gestione Ordini Colazione Hotel
// ============================================================

// ============================================================
// STATO GLOBALE
// ============================================================

let currentFilter = 'all';
let items = [];
let extraItems = [];
let isInitialized = false;
let currentOrderId = null;

// ============================================================
// INIZIALIZZAZIONE
// ============================================================

/**
 * Inizializza l'applicazione
 */
async function initApp() {
  console.log('🚀 Avvio applicazione...');
  
  // Mostra stato caricamento
  const container = document.getElementById('items-container');
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⏳</div>
        <div class="empty-state-text">Caricamento...</div>
      </div>
    `;
  }
  
  // Carica i prodotti
  loadProducts();
  
  // Prova a caricare i dati salvati
  await loadSavedData();
  
  // Se ancora vuoto, usa i prodotti di default
  if (items.length === 0) {
    items = JSON.parse(JSON.stringify(STANDARD_PRODUCTS));
    items.forEach(item => {
      item.selected = false;
      item.qty = 0;
    });
    console.log('📦 Prodotti di default caricati:', items.length);
  }
  
  // Aggiorna UI
  renderItems();
  updateStats();
  updateConnectionStatus();
  isInitialized = true;
  
  console.log('✅ App inizializzata con', items.length, 'prodotti');
}

/**
 * Carica i prodotti dal file products.js
 */
function loadProducts() {
  if (typeof STANDARD_PRODUCTS !== 'undefined' && STANDARD_PRODUCTS.length > 0) {
    console.log('📦 Prodotti caricati da products.js:', STANDARD_PRODUCTS.length);
    // Non sovrascrivere items se già ci sono dati salvati
    if (items.length === 0) {
      items = JSON.parse(JSON.stringify(STANDARD_PRODUCTS));
      items.forEach(item => {
        item.selected = false;
        item.qty = 0;
      });
    }
  } else {
    console.warn('⚠️ STANDARD_PRODUCTS non trovato, uso prodotti di fallback');
    loadFallbackProducts();
  }
}

/**
 * Prodotti di fallback (se products.js non viene caricato)
 */
function loadFallbackProducts() {
  items = [
    { id: 'latte-intero', name: 'Latte Intero', category: 'Bevande', selected: false, qty: 0 },
    { id: 'latte-scremato', name: 'Latte Scremato', category: 'Bevande', selected: false, qty: 0 },
    { id: 'cappuccino', name: 'Cappuccino in polvere', category: 'Bevande', selected: false, qty: 0 },
    { id: 'succo-arancia', name: 'Succo d\'Arancia', category: 'Bevande', selected: false, qty: 0 },
    { id: 'cornetto-cioccolato', name: 'Cornetto Cioccolato', category: 'Cornetti', selected: false, qty: 0 },
    { id: 'cornetto-albicocca', name: 'Cornetto Albicocca', category: 'Cornetti', selected: false, qty: 0 },
    { id: 'yogurt-bianco', name: 'Yogurt Bianco', category: 'Yogurt', selected: false, qty: 0 },
    { id: 'yogurt-fragola', name: 'Yogurt Fragola', category: 'Yogurt', selected: false, qty: 0 },
    { id: 'prosciutto-cotto', name: 'Prosciutto Cotto', category: 'Salato', selected: false, qty: 0 },
    { id: 'formaggio-fette', name: 'Formaggio a Fette', category: 'Salato', selected: false, qty: 0 },
    { id: 'marmellata-albicocca', name: 'Marmellata Albicocca', category: 'Dolci', selected: false, qty: 0 },
    { id: 'miele-monodose', name: 'Miele Monodose', category: 'Dolci', selected: false, qty: 0 },
    { id: 'pane-slice', name: 'Pane in Cassetta', category: 'Extra', selected: false, qty: 0 },
    { id: 'biscotti-secchi', name: 'Biscotti Secchi', category: 'Extra', selected: false, qty: 0 }
  ];
}

// ============================================================
// CARICAMENTO DATI SALVATI
// ============================================================

/**
 * Carica i dati salvati (prima Firebase, poi localStorage)
 */
async function loadSavedData() {
  // Prova a caricare da Firebase
  if (isFirebaseReady()) {
    try {
      await loadFromFirebase();
      if (items.length > 0) {
        console.log('☁️ Dati caricati da Firebase');
        return;
      }
    } catch (error) {
      console.warn('⚠️ Errore caricamento Firebase:', error);
    }
  }
  
  // Fallback: localStorage
  loadFromLocalStorage();
}

/**
 * Carica da Firebase
 */
async function loadFromFirebase() {
  try {
    const db = getFirestore();
    if (!db) return;
    
    const snapshot = await db.collection('currentOrder').get();
    if (snapshot.empty) {
      console.log('ℹ️ Nessun ordine salvato su Firebase');
      return;
    }
    
    let foundData = false;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.items && data.items.length > 0) {
        items = data.items;
        currentOrderId = doc.id;
        foundData = true;
        console.log('✅ Ordine caricato da Firebase ID:', currentOrderId);
      }
      if (data.extraItems) {
        extraItems = data.extraItems || [];
      }
    });
    
    if (!foundData) {
      console.log('ℹ️ Nessun dato valido su Firebase');
    }
  } catch (error) {
    console.error('❌ Errore caricamento Firebase:', error);
  }
}

/**
 * Carica dal localStorage
 */
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('orderData');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.items && data.items.length > 0) {
        items = data.items;
        console.log('💾 Dati caricati dal localStorage:', items.length);
      }
      if (data.extraItems) {
        extraItems = data.extraItems || [];
      }
    }
  } catch (error) {
    console.error('❌ Errore localStorage:', error);
  }
}

// ============================================================
// SALVATAGGIO DATI
// ============================================================

/**
 * Salva i dati (Firebase + localStorage)
 */
async function saveData() {
  // Salva sempre in localStorage
  saveToLocalStorage();
  
  // Salva in Firebase se disponibile
  if (isFirebaseReady() && navigator.onLine) {
    await saveToFirebase();
  }
}

/**
 * Salva in localStorage
 */
function saveToLocalStorage() {
  try {
    const data = {
      items: items,
      extraItems: extraItems,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('orderData', JSON.stringify(data));
    console.log('💾 Dati salvati in localStorage');
  } catch (error) {
    console.error('❌ Errore salvataggio localStorage:', error);
  }
}

/**
 * Salva in Firebase
 */
async function saveToFirebase() {
  try {
    const db = getFirestore();
    if (!db) return;
    
    const orderData = {
      items: items,
      extraItems: extraItems,
      updatedAt: new Date().toISOString(),
      totalItems: items.filter(i => i.selected && i.qty > 0).length,
      totalQty: items.reduce((sum, i) => sum + (i.selected ? i.qty : 0), 0)
    };
    
    if (currentOrderId) {
      await db.collection('currentOrder').doc(currentOrderId).update(orderData);
      console.log('☁️ Dati aggiornati su Firebase (ID:', currentOrderId, ')');
    } else {
      const docRef = await db.collection('currentOrder').add(orderData);
      currentOrderId = docRef.id;
      console.log('☁️ Nuovo ordine creato su Firebase (ID:', currentOrderId, ')');
    }
  } catch (error) {
    console.error('❌ Errore salvataggio Firebase:', error);
  }
}

// ============================================================
// RENDERIZZAZIONE
// ============================================================

/**
 * Renderizza gli articoli
 */
function renderItems() {
  const container = document.getElementById('items-container');
  if (!container) return;
  
  // Filtra items
  let filteredItems = [...items];
  
  if (currentFilter === 'selected') {
    filteredItems = filteredItems.filter(item => item.selected && item.qty > 0);
  } else if (currentFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.category === currentFilter);
  }
  
  // Se filtro "selected" e non ci sono risultati
  if (currentFilter === 'selected' && filteredItems.length === 0 && extraItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">
          Nessun articolo selezionato
          <br>
          <small>Tocca ☐ per selezionare gli articoli da ordinare</small>
        </div>
      </div>
    `;
    return;
  }
  
  // Se nessun filtro e nessun item
  if (filteredItems.length === 0 && extraItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-text">
          Nessun prodotto disponibile
          <br>
          <small>Caricamento prodotti in corso...</small>
        </div>
      </div>
    `;
    return;
  }
  
  // Ordina: prima selezionati, poi per categoria
  filteredItems.sort((a, b) => {
    if (a.selected !== b.selected) return a.selected ? -1 : 1;
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });
  
  let html = '';
  let currentCategory = '';
  
  filteredItems.forEach((item) => {
    // Header categoria
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      const categoryItems = filteredItems.filter(i => i.category === currentCategory);
      const selectedInCategory = categoryItems.filter(i => i.selected && i.qty > 0).length;
      
      html += `
        <div class="category-header" data-category="${currentCategory}">
          <span class="category-title">
            <span class="category-icon">${getCategoryIcon(currentCategory)}</span>
            ${currentCategory}
          </span>
          <span class="category-count ${selectedInCategory > 0 ? 'has-selected' : ''}">
            ${selectedInCategory}/${categoryItems.length}
          </span>
        </div>
      `;
    }
    
    const isSelected = item.selected && item.qty > 0;
    html += `
      <div class="item-row ${isSelected ? 'selected' : ''}" data-id="${item.id}">
        <div class="item-checkbox" onclick="toggleSelect('${item.id}')">
          ${isSelected ? '✓' : ''}
        </div>
        <div class="item-name" onclick="toggleSelect('${item.id}')">
          ${item.name}
        </div>
        <div class="item-qty-controls">
          <button class="qty-btn minus" onclick="adjustQty('${item.id}', -1)" ${!isSelected ? 'disabled style="opacity:0.3;"' : ''}>−</button>
          <span class="item-qty ${isSelected ? 'has-qty' : ''}">${isSelected ? item.qty : 0}</span>
          <button class="qty-btn plus" onclick="adjustQty('${item.id}', 1)">+</button>
        </div>
      </div>
    `;
  });
  
  // Extra items
  if (extraItems.length > 0 && currentFilter !== 'selected') {
    html += `
      <div class="category-header" data-category="Extra">
        <span class="category-title">
          <span class="category-icon">➕</span>
          Extra
        </span>
        <span class="category-count has-selected">${extraItems.length}</span>
      </div>
    `;
    
    extraItems.forEach((item, index) => {
      html += `
        <div class="item-row extra selected" data-id="extra_${index}">
          <div class="item-checkbox" style="background:#fbbf24;border-color:#fbbf24;color:#78350f;">
            ✚
          </div>
          <div class="item-name">
            ${item.name}
            <span class="extra-badge">EXTRA</span>
          </div>
          <div class="item-qty-controls">
            <button class="qty-btn minus" onclick="adjustExtraQty(${index}, -1)">−</button>
            <span class="item-qty has-qty">${item.qty || 0}</span>
            <button class="qty-btn plus" onclick="adjustExtraQty(${index}, 1)">+</button>
            <button class="item-delete-btn" onclick="removeExtra(${index})" title="Rimuovi">✖</button>
          </div>
        </div>
      `;
    });
  }
  
  container.innerHTML = html;
  updateStats();
}

/**
 * Ottieni icona per categoria
 */
function getCategoryIcon(category) {
  const icons = {
    'Bevande': '☕',
    'Cornetti': '🥐',
    'Yogurt': '🥄',
    'Salato': '🥓',
    'Dolci': '🍯',
    'Extra': '➕'
  };
  return icons[category] || '📦';
}

/**
 * Aggiorna le statistiche
 */
function updateStats() {
  const selectedCount = items.filter(i => i.selected && i.qty > 0).length;
  const totalQty = items.reduce((sum, i) => sum + (i.selected ? i.qty : 0), 0);
  const extraTotal = extraItems.reduce((sum, i) => sum + (i.qty || 0), 0);
  
  const selectedEl = document.getElementById('selected-count');
  const totalEl = document.getElementById('total-qty');
  
  if (selectedEl) selectedEl.textContent = selectedCount + extraItems.length;
  if (totalEl) totalEl.textContent = totalQty + extraTotal;
}

/**
 * Aggiorna stato connessione
 */
function updateConnectionStatus() {
  const statusEl = document.getElementById('connection-status');
  if (!statusEl) return;
  
  const isOnline = navigator.onLine;
  const isFirebase = isFirebaseReady();
  
  if (isOnline && isFirebase) {
    statusEl.className = 'connection-status online';
    statusEl.textContent = '● Cloud';
  } else if (isOnline) {
    statusEl.className = 'connection-status local';
    statusEl.textContent = '● Locale';
  } else {
    statusEl.className = 'connection-status offline';
    statusEl.textContent = '● Offline';
  }
}

// ============================================================
// INTERAZIONI
// ============================================================

/**
 * Regola quantità di un articolo
 */
function adjustQty(itemId, delta) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  
  const newQty = Math.max(0, (item.qty || 0) + delta);
  item.qty = newQty;
  item.selected = newQty > 0;
  
  renderItems();
  saveData();
}

/**
 * Toggle selezione di un articolo
 */
function toggleSelect(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) return;
  
  if (item.selected) {
    item.selected = false;
    item.qty = 0;
  } else {
    item.selected = true;
    if (!item.qty || item.qty === 0) {
      item.qty = 1;
    }
  }
  
  renderItems();
  saveData();
}

/**
 * Aggiungi articolo extra
 */
function addExtraItem(name, qty) {
  if (!name || name.trim() === '') {
    showToast('Inserisci un nome valido', 'warning');
    return;
  }
  
  extraItems.push({ 
    name: name.trim(), 
    qty: qty || 1,
    category: 'Extra'
  });
  
  renderItems();
  saveData();
  showToast(`✅ Aggiunto "${name.trim()}"`, 'success');
}

/**
 * Regola quantità extra
 */
function adjustExtraQty(index, delta) {
  if (index < 0 || index >= extraItems.length) return;
  const newQty = Math.max(0, (extraItems[index].qty || 0) + delta);
  extraItems[index].qty = newQty;
  
  if (newQty === 0) {
    extraItems.splice(index, 1);
  }
  
  renderItems();
  saveData();
}

/**
 * Rimuovi extra
 */
function removeExtra(index) {
  if (index < 0 || index >= extraItems.length) return;
  const name = extraItems[index].name;
  extraItems.splice(index, 1);
  renderItems();
  saveData();
  showToast(`🗑️ Rimosso "${name}"`, 'info');
}

// ============================================================
// FILTRI
// ============================================================

/**
 * Imposta filtro
 */
function setFilter(filter) {
  currentFilter = filter;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  
  renderItems();
}

// ============================================================
// MODALE EXTRA
// ============================================================

/**
 * Mostra modal per aggiungere extra
 */
function showAddExtraModal() {
  const name = prompt('Inserisci il nome dell\'articolo extra:');
  if (!name || name.trim() === '') return;
  
  const qty = prompt('Inserisci la quantità:', '1');
  const qtyNum = parseInt(qty) || 1;
  
  addExtraItem(name.trim(), qtyNum);
}

// ============================================================
// STAMPA
// ============================================================

/**
 * Stampa ordine
 */
function printOrder() {
  const selectedItems = items.filter(i => i.selected && i.qty > 0);
  
  if (selectedItems.length === 0 && extraItems.length === 0) {
    showToast('⚠️ Nessun articolo selezionato per la stampa', 'warning');
    return;
  }
  
  // Aggiorna data nella stampa
  const dateEl = document.getElementById('print-date');
  if (dateEl) {
    dateEl.textContent = 'Data: ' + new Date().toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  window.print();
}

// ============================================================
// RESET
// ============================================================

/**
 * Conferma reset ordine
 */
function confirmResetOrder() {
  if (confirm('⚠️ Sei sicuro di voler resettare TUTTO l\'ordine?\n\nQuesta azione non può essere annullata.')) {
    resetOrder();
  }
}

/**
 * Reset ordine
 */
function resetOrder() {
  items.forEach(item => {
    item.selected = false;
    item.qty = 0;
  });
  extraItems = [];
  
  // Reset anche su Firebase
  if (currentOrderId && isFirebaseReady()) {
    try {
      const db = getFirestore();
      if (db) {
        db.collection('currentOrder').doc(currentOrderId).delete();
        currentOrderId = null;
        console.log('🗑️ Ordine eliminato da Firebase');
      }
    } catch (e) {
      console.warn('Errore eliminazione Firebase:', e);
    }
  }
  
  renderItems();
  saveData();
  showToast('🔄 Ordine resettato', 'info');
}

// ============================================================
// TOAST NOTIFICHE
// ============================================================

/**
 * Mostra toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * Crea container per toast
 */
function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// ============================================================
// GESTIONE CONNESSIONE
// ============================================================

// Ascolta eventi di connessione
window.addEventListener('online', () => {
  console.log('📶 Connessione ripristinata');
  updateConnectionStatus();
  // Se Firebase è pronto, sincronizza
  if (isFirebaseReady()) {
    loadFromFirebase().then(() => {
      renderItems();
      showToast('📶 Sincronizzato con il cloud', 'success');
    });
  }
});

window.addEventListener('offline', () => {
  console.log('📴 Connessione persa');
  updateConnectionStatus();
  showToast('📴 Modalità offline attiva', 'warning');
});

// ============================================================
// AVVIO APP
// ============================================================

// Attendi il caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
  // Piccolo ritardo per assicurarsi che Firebase sia caricato
  setTimeout(initApp, 100);
});

// Se la pagina è già caricata
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initApp, 100);
}

console.log('📦 app.js caricato correttamente');
