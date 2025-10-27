/**********************************************
 * ShopSmart — Front-end demo
 * - Simulates users, cart, vendors, wallet, PINs
 * - Uses localStorage for persistence
 **********************************************/

/* ---------- Utilities ---------- */
const $ = sel => document.querySelector(sel);
const qs = sel => document.querySelectorAll(sel);
const formatCurrency = v => `₦${Number(v).toFixed(2)}`;
const uid = () => Math.random().toString(36).slice(2,9);

/* ---------- Data Seeds ---------- */
const SAMPLE_PRODUCTS = [
  { id: 'p1', vendorId: 'v1', name: 'Fresh Bread', category:'Food', price: 300, desc:'Homemade bread', img:'https://picsum.photos/seed/bread/400/300' },
  { id: 'p2', vendorId: 'v2', name: 'Running Shoes', category:'Shoes', price: 4500, desc:'Comfortable running shoes', img:'https://picsum.photos/seed/shoes/400/300' },
  { id: 'p3', vendorId: 'v3', name: 'Blue Shirt', category:'Clothes', price: 2500, desc:'Smart casual shirt', img:'https://picsum.photos/seed/shirt/400/300' },
  { id: 'p4', vendorId: 'v2', name: 'Leather Bag', category:'Bags', price: 5200, desc:'Stylish leather bag', img:'https://picsum.photos/seed/bag/400/300' },
  { id: 'p5', vendorId: 'v1', name: 'Spice Pack', category:'Food', price: 800, desc:'Assorted spices', img:'https://picsum.photos/seed/spice/400/300' },
  { id: 'p6', vendorId: 'v3', name: 'Canvas Sneakers', category:'Shoes', price: 3800, desc:'Casual sneakers', img:'https://picsum.photos/seed/sneak/400/300' },
];

/* ---------- Local Storage Keys ---------- */
const LS = {
  USERS: 'ss_users',
  CURRENT: 'ss_current', // email
  PRODUCTS: 'ss_products',
  VENDORS: 'ss_vendors',
  CART: 'ss_cart', // { userEmail: [cartItems] } or single cart for demo
  LIKES: 'ss_likes',
  TXNS: 'ss_txns' // per user txn history
};

/* ---------- App State ---------- */
let state = {
  users: {}, // email -> user object
  currentUser: null, // email string
  products: [],
  vendors: [],
  cart: [], // { productId, qty }
  likes: [],
  txns: [] // transactions
};

/* ---------- Initialize App ---------- */
function loadState(){
  state.users = JSON.parse(localStorage.getItem(LS.USERS) || '{}');
  state.currentUser = localStorage.getItem(LS.CURRENT) || null;
  state.products = JSON.parse(localStorage.getItem(LS.PRODUCTS) || 'null') || SAMPLE_PRODUCTS;
  state.vendors = JSON.parse(localStorage.getItem(LS.VENDORS) || 'null') || [
    { id:'v1', name:'FreshGoods', category:'Food', contact:'fresh@store.demo' },
    { id:'v2', name:'Stride Co', category:'Shoes', contact:'stride@store.demo' },
    { id:'v3', name:'UrbanWear', category:'Clothes', contact:'urban@store.demo' }
  ];
  state.cart = JSON.parse(localStorage.getItem(LS.CART) || '[]');
  state.likes = JSON.parse(localStorage.getItem(LS.LIKES) || '[]');
  state.txns = JSON.parse(localStorage.getItem(LS.TXNS) || '{}');
}

function saveState(){
  localStorage.setItem(LS.USERS, JSON.stringify(state.users));
  localStorage.setItem(LS.PRODUCTS, JSON.stringify(state.products));
  localStorage.setItem(LS.VENDORS, JSON.stringify(state.vendors));
  localStorage.setItem(LS.CART, JSON.stringify(state.cart));
  localStorage.setItem(LS.LIKES, JSON.stringify(state.likes));
  localStorage.setItem(LS.TXNS, JSON.stringify(state.txns));
  if(state.currentUser) localStorage.setItem(LS.CURRENT, state.currentUser); else localStorage.removeItem(LS.CURRENT);
}

/* ---------- Rendering ---------- */

function renderApp(){
  $('#year').textContent = new Date().getFullYear();
  renderHeader();
  routeTo('home'); // default
}

function renderHeader(){
  const loginBtn = $('#login-btn');
  const logoutBtn = $('#logout-btn');
  const dashboardLink = $('#dashboard-link');
  const settingsLink = $('#settings-link');

  if(state.currentUser){
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    dashboardLink.classList.remove('hidden');
    settingsLink.classList.remove('hidden');
  } else {
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    dashboardLink.classList.add('hidden');
    settingsLink.classList.add('hidden');
  }
  updateCartCount();
}

/* Basic routing by page name -> render function */
function routeTo(page){
  // clear main
  const main = $('#app');
  main.innerHTML = '';
  if(page === 'home') renderHome(main);
  if(page === 'store') renderStore(main);
  if(page === 'vendors') renderVendors(main);
  if(page === 'dashboard') renderDashboard(main);
  if(page === 'settings') renderSettings(main);
}

/* ---------- Pages ---------- */

function renderHome(container){
  const el = document.createElement('div');
  el.className = 'container';
  el.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <h1>Welcome to ShopSmart</h1>
        <p>A front-end demo e-commerce platform. Browse products, register as vendor, manage balance and PINs — all simulated with localStorage.</p>
        <div class="hero-actions">
          <button id="go-store" class="btn btn-primary">Go to Store</button>
          <button id="open-login" class="btn btn-ghost">Login / Register</button>
        </div>
      </div>
      <div class="hero-visual">
        <img src="https://picsum.photos/seed/shophero/420/260" alt="shop" style="width:320px;border-radius:12px;">
      </div>
    </section>
  `;
  container.appendChild(el);

  $('#go-store').addEventListener('click', ()=> routeTo('store'));
  $('#open-login').addEventListener('click', openAuthModal);
}

function renderStore(container){
  const categories = ['All','Food','Shoes','Clothes','Bags','Other'];
  const el = document.createElement('div');
  el.className = 'container';

  el.innerHTML = `
    <h2>Store</h2>
    <div class="categories" id="category-list"></div>
    <div class="products-grid" id="products-grid"></div>
  `;
  container.appendChild(el);

  const catList = el.querySelector('#category-list');
  categories.forEach(c => {
    const card = document.createElement('div');
    card.className = 'category-card';
    card.textContent = c;
    card.addEventListener('click', ()=> {
      renderProducts(c === 'All' ? state.products : state.products.filter(p => p.category === c))
    });
    catList.appendChild(card);
  });

  // initial
  renderProducts(state.products);

  function renderProducts(products){
    const grid = el.querySelector('#products-grid');
    grid.innerHTML = '';
    products.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.img}" alt="${p.name}">
        <div>
          <h3>${p.name}</h3>
          <p>${p.desc}</p>
        </div>
        <div class="product-meta">
          <strong>${formatCurrency(p.price)}</strong>
          <div>
            <small>${p.category}</small>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn btn-primary add-to-cart" data-id="${p.id}">Add to Cart</button>
          <button class="btn btn-ghost like-btn" data-id="${p.id}"><i class="bi bi-heart"></i></button>
        </div>
      `;
      grid.appendChild(card);
    });

    // attach events
    qs('.add-to-cart').forEach(b => {
      b.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        addToCart(id);
      });
    });
    qs('.like-btn').forEach(b => {
      const id = b.dataset.id;
      if(state.likes.includes(id)) b.classList.add('liked');
      b.addEventListener('click', ()=>{
        toggleLike(id);
        b.classList.toggle('liked');
      });
    });
  }
}

function renderVendors(container){
  const el = document.createElement('div');
  el.className = 'container';
  el.innerHTML = `
    <h2>Vendors</h2>
    <button id="open-vendor-reg" class="btn btn-primary">Register as Vendor</button>
    <div class="vendor-grid" id="vendor-grid"></div>
  `;
  container.appendChild(el);

  $('#open-vendor-reg').addEventListener('click', openVendorModal);

  const grid = el.querySelector('#vendor-grid');
  grid.innerHTML = '';
  state.vendors.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vendor-card';
    card.innerHTML = `
      <h3>${v.name}</h3>
      <p>Category: ${v.category}</p>
      <p>Contact: ${v.contact}</p>
      <div><a href="#" data-v="${v.id}" class="view-vendor">View Products</a></div>
    `;
    grid.appendChild(card);
  });

  qs('.view-vendor').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const vid = e.currentTarget.dataset.v;
      const vendor = state.vendors.find(x=>x.id===vid);
      routeTo('store');
      setTimeout(()=> {
        // render only vendor products
        const products = state.products.filter(p => p.vendorId === vid);
        // If none, show vendor-only or all vendor products
        const grid = document.querySelector('#products-grid');
        if(grid) grid.innerHTML = '';
        products.forEach(p => {
          // reuse small product card creation
          // Append to grid
          const productHTML = document.createElement('div');
          productHTML.className = 'product-card';
          productHTML.innerHTML = `
            <img src="${p.img}" alt="${p.name}">
            <div>
              <h3>${p.name}</h3>
              <p>${p.desc}</p>
            </div>
            <div class="product-meta">
              <strong>${formatCurrency(p.price)}</strong>
              <div>
                <small>${p.category}</small>
              </div>
            </div>
            <div class="product-actions">
              <button class="btn btn-primary add-to-cart" data-id="${p.id}">Add to Cart</button>
              <button class="btn btn-ghost like-btn" data-id="${p.id}"><i class="bi bi-heart"></i></button>
            </div>
          `;
          grid.appendChild(productHTML);
        });
      }, 50);
    });
  });
}

function renderDashboard(container){
  if(!state.currentUser){
    container.innerHTML = `<div class="container"><h2>Please login to view your dashboard</h2><button class="btn btn-primary" id="open-login-2">Login Now</button></div>`;
    $('#open-login-2').addEventListener('click', openAuthModal);
    return;
  }
  const user = state.users[state.currentUser];
  const profilePic = user.avatar || '';
  const balance = user.balance || 0;
  const el = document.createElement('div');
  el.className = 'container';
  el.innerHTML = `
    <h2>Dashboard</h2>
    <div class="profile-card">
      <div class="profile-avatar">
        ${profilePic ? `<img src="${profilePic}" style="width:82px;height:82px;border-radius:50%;object-fit:cover">` : user.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3>${user.name}</h3>
        <p>${user.email}</p>
        <div class="stats">
          <div class="stat">
            <h4>Balance</h4>
            <p id="user-balance">${formatCurrency(balance)}</p>
            <button class="btn btn-primary" id="fund-balance">Fund Wallet</button>
          </div>
          <div class="stat">
            <h4>Transactions</h4>
            <p id="txn-count">${(state.txns[user.email]||[]).length}</p>
            <button class="btn btn-ghost" id="view-txns">View</button>
          </div>
        </div>
      </div>
    </div>

    <section style="margin-top:18px">
      <h3>Your liked items</h3>
      <div id="liked-items" class="products-grid"></div>
    </section>

    <section style="margin-top:18px">
      <h3>Your products (if vendor)</h3>
      <div id="vendor-products" class="products-grid"></div>
    </section>
  `;
  container.appendChild(el);

  $('#fund-balance').addEventListener('click', openFundModal);
  $('#view-txns').addEventListener('click', ()=> showTransactions(user.email));

  // render liked items
  const likedGrid = el.querySelector('#liked-items');
  likedGrid.innerHTML = '';
  (state.likes || []).forEach(pid=>{
    const p = state.products.find(x=>x.id===pid);
    if(!p) return;
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>${p.desc}</p>
      <div class="product-actions">
        <button class="btn btn-primary add-to-cart" data-id="${p.id}">Add to Cart</button>
      </div>
    `;
    likedGrid.appendChild(card);
  });

  // vendor products (if user is vendor)
  const vpGrid = el.querySelector('#vendor-products');
  vpGrid.innerHTML = '';
  if(user.role === 'vendor'){
    const vid = user.vendorId;
    const vendorProducts = state.products.filter(p => p.vendorId === vid);
    vendorProducts.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${p.img}" alt="${p.name}">
        <h4>${p.name}</h4>
        <p>${p.desc}</p>
        <div class="product-actions">
          <button class="btn btn-ghost" data-edit="${p.id}">Edit</button>
          <button class="btn btn-ghost" data-del="${p.id}">Delete</button>
        </div>
      `;
      vpGrid.appendChild(card);
    });
    // attach event handlers for edit/delete (simplified)
    qs('[data-del]').forEach(b => {
      b.addEventListener('click', e=>{
        const id = e.currentTarget.dataset.del;
        state.products = state.products.filter(x=>x.id !== id);
        saveState();
        renderDashboard(container);
      });
    });
  } else {
    vpGrid.innerHTML = `<p>You are not a vendor. <button class="btn btn-primary" id="become-vendor">Register as Vendor</button></p>`;
    $('#become-vendor').addEventListener('click', openVendorModal);
  }
}

/* Settings page */
function renderSettings(container){
  if(!state.currentUser){
    container.innerHTML = `<div class="container"><h2>Please login to access settings</h2><button class="btn btn-primary" id="open-login-3">Login Now</button></div>`;
    $('#open-login-3').addEventListener('click', openAuthModal);
    return;
  }
  const user = state.users[state.currentUser];
  const el = document.createElement('div');
  el.className = 'container';
  el.innerHTML = `
    <h2>Settings</h2>
    <div class="modal-card" style="padding:16px;">
      <label>Display name: <input id="set-name" value="${user.name}"></label>
      <label>Email: <input id="set-email" value="${user.email}" disabled></label>
      <label>Upload profile picture: <input id="set-avatar" type="file" accept="image/*"></label>
      <label>Set/Change PIN: <input id="set-pin" placeholder="New 4-digit PIN" type="password" maxlength="6"></label>
      <div style="margin-top:10px">
        <button id="save-settings" class="btn btn-primary">Save</button>
      </div>
      <div id="settings-message" class="message"></div>
    </div>
  `;
  container.appendChild(el);

  $('#set-avatar').addEventListener('change', handleAvatarUpload);
  $('#save-settings').addEventListener('click', saveSettings);
}

/* ---------- Modal Helpers ---------- */

function openModal(id){
  $('#modal-backdrop').classList.remove('hidden');
  const modal = $(id);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
}
function closeModal(id){
  $('#modal-backdrop').classList.add('hidden');
  const modal = $(id);
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden','true');
}
function closeAllModals(){
  qs('.modal').forEach(m => m.classList.add('hidden'));
  $('#modal-backdrop').classList.add('hidden');
}

/* ---------- Auth (simulate) ---------- */

function openAuthModal(){
  openModal('#auth-modal');
  $('#auth-forms #login-form').classList.remove('hidden');
  $('#auth-forms #register-form').classList.add('hidden');
}

$('#show-register')?.addEventListener('click', e=>{
  e.preventDefault();
  $('#auth-forms #login-form').classList.add('hidden');
  $('#auth-forms #register-form').classList.remove('hidden');
});
$('#show-login')?.addEventListener('click', e=>{
  e.preventDefault();
  $('#auth-forms #login-form').classList.remove('hidden');
  $('#auth-forms #register-form').classList.add('hidden');
});

$('#register-submit')?.addEventListener('click', ()=>{
  const name = $('#reg-name').value.trim();
  const email = $('#reg-email').value.trim().toLowerCase();
  const pass = $('#reg-password').value;
  const role = $('#reg-role').value;

  if(!name || !email || !pass){ alert('Complete fields'); return; }
  if(state.users[email]){ alert('User exists'); return; }

  // create user
  const newUser = {
    name, email, password: pass, role, balance: 0, pin: null, avatar: null
  };

  // if vendor, create vendor profile
  if(role === 'vendor'){
    const vid = uid();
    state.vendors.push({ id: vid, name: `${name}'s Shop`, category:'Other', contact: email });
    newUser.vendorId = vid;
  }

  state.users[email] = newUser;
  state.currentUser = email;
  saveState();
  closeModal('#auth-modal');
  renderHeader();
  routeTo('dashboard');
  alert('Registration successful — you are now logged in (demo).');
});

$('#login-submit')?.addEventListener('click', ()=>{
  const email = $('#login-email').value.trim().toLowerCase();
  const pass = $('#login-password').value;
  if(!email || !pass){ alert('Enter credentials'); return; }
  const u = state.users[email];
  if(!u || u.password !== pass){ alert('Invalid credentials'); return; }
  state.currentUser = email;
  saveState();
  closeModal('#auth-modal');
  renderHeader();
  routeTo('dashboard');
  alert('Logged in (demo).');
});

$('#logout-btn')?.addEventListener('click', ()=>{
  state.currentUser = null;
  saveState();
  renderHeader();
  routeTo('home');
});

/* ---------- Cart & Likes ---------- */

function addToCart(productId){
  // check if exists
  const item = state.cart.find(c => c.productId === productId);
  if(item) item.qty += 1; else state.cart.push({ productId, qty:1 });
  saveState();
  updateCartCount();
  alert('Added to cart');
}

function updateCartCount(){
  const count = state.cart.reduce((s,i)=>s+i.qty,0);
  $('#cart-count').textContent = count;
}

/* Open cart modal */
$('#cart-btn').addEventListener('click', ()=>{
  openCart();
});

function openCart(){
  renderCartItems();
  openModal('#cart-modal');
}

function renderCartItems(){
  const area = $('#cart-items');
  area.innerHTML = '';
  if(state.cart.length === 0){ area.innerHTML = '<p>Your cart is empty</p>'; $('#cart-total').textContent = formatCurrency(0); return; }

  let total = 0;
  state.cart.forEach(ci=>{
    const p = state.products.find(x=>x.id===ci.productId);
    if(!p) return;
    total += p.price * ci.qty;
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.style.display = 'flex'; row.style.gap = '10px'; row.style.margin = '8px 0'; row.style.alignItems='center';
    row.innerHTML = `
      <img src="${p.img}" style="width:72px;height:56px;object-fit:cover;border-radius:8px">
      <div style="flex:1">
        <strong>${p.name}</strong>
        <p style="margin:4px 0">${formatCurrency(p.price)} x ${ci.qty}</p>
      </div>
      <div>
        <button class="btn" data-minus="${p.id}">-</button>
        <button class="btn" data-plus="${p.id}">+</button>
        <button class="btn" data-remove="${p.id}">Remove</button>
      </div>
    `;
    area.appendChild(row);
  });

  $('#cart-total').textContent = formatCurrency(total);

  // attach events
  qs('[data-plus]').forEach(b => b.addEventListener('click', e=>{
    const id = e.currentTarget.dataset.plus;
    const item = state.cart.find(x=>x.productId===id);
    item.qty++; saveState(); renderCartItems(); updateCartCount();
  }));
  qs('[data-minus]').forEach(b => b.addEventListener('click', e=>{
    const id = e.currentTarget.dataset.minus;
    const item = state.cart.find(x=>x.productId===id);
    if(item.qty>1) item.qty--; else state.cart = state.cart.filter(x=>x.productId!==id);
    saveState(); renderCartItems(); updateCartCount();
  }));
  qs('[data-remove]').forEach(b => b.addEventListener('click', e=>{
    const id = e.currentTarget.dataset.remove;
    state.cart = state.cart.filter(x=>x.productId!==id);
    saveState(); renderCartItems(); updateCartCount();
  }));
}

/* clear cart */
$('#clear-cart-btn')?.addEventListener('click', ()=>{
  if(confirm('Clear cart?')) { state.cart = []; saveState(); renderCartItems(); updateCartCount(); }
});

/* checkout flow */
$('#checkout-btn')?.addEventListener('click', ()=>{
  if(state.cart.length === 0){ alert('Cart empty'); return; }
  openModal('#checkout-modal');
  $('#checkout-message').textContent = '';
});

/* confirm payment */
$('#confirm-payment')?.addEventListener('click', ()=>{
  if(!state.currentUser){ alert('Please login to checkout'); closeAllModals(); openAuthModal(); return; }
  const method = $('#payment-method').value;
  const pin = $('#checkout-pin').value;
  const user = state.users[state.currentUser];

  // compute total
  let total = 0;
  state.cart.forEach(ci => {
    const p = state.products.find(x=>x.id===ci.productId);
    if(p) total += p.price * ci.qty;
  });

  if(method === 'wallet'){
    // ensure PIN set
    if(!user.pin){ 
      if(confirm('You have not set a PIN. Set it now?')){
        closeAllModals();
        routeTo('settings');
        return;
      } else {
        $('#checkout-message').textContent = 'PIN required for wallet payments.';
        return;
      }
    }
    if(!pin || pin !== user.pin){ $('#checkout-message').textContent = 'Invalid PIN.'; return; }
    if(user.balance < total){ $('#checkout-message').textContent = 'Insufficient funds.'; return; }

    // success
    user.balance -= total;
    // record txn
    const tx = { id: uid(), type:'purchase', amount: total, date: new Date().toISOString(), items: state.cart.map(c=>({id:c.productId,q:c.qty})) };
    state.txns[user.email] = state.txns[user.email]||[];
    state.txns[user.email].push(tx);

    // clear cart
    state.cart = [];
    saveState();
    renderHeader();
    renderDashboard($('#app')); // refresh dashboard if open
    $('#checkout-message').textContent = 'Payment successful. Thank you!';
    setTimeout(()=>{ closeAllModals(); routeTo('dashboard'); alert('Payment completed (demo).'); }, 900);
  } else {
    // simulate card or bank: accept and add to txns
    const tx = { id: uid(), type: method, amount: total, date: new Date().toISOString(), items: state.cart.map(c=>({id:c.productId,q:c.qty})) };
    state.txns[state.currentUser] = state.txns[state.currentUser]||[];
    state.txns[state.currentUser].push(tx);
    state.cart = [];
    saveState();
    $('#checkout-message').textContent = 'Payment simulated (card/bank). Order placed.';
    setTimeout(()=>{ closeAllModals(); routeTo('dashboard'); }, 900);
  }
});

/* ---------- Likes ---------- */
function toggleLike(productId){
  if(state.likes.includes(productId)) state.likes = state.likes.filter(x=>x!==productId);
  else state.likes.push(productId);
  saveState();
}

/* ---------- Vendor Registration ---------- */

function openVendorModal(){
  if(!state.currentUser){ openAuthModal(); return; }
  openModal('#vendor-modal');
}

$('#vendor-register-btn')?.addEventListener('click', ()=>{
  const name = $('#vendor-name').value.trim();
  const cat = $('#vendor-category').value;
  if(!name){ alert('Enter vendor name'); return; }
  const vid = uid();
  const vendor = { id: vid, name, category: cat, contact: state.currentUser || 'demo' };
  state.vendors.push(vendor);
  // if current user is customer, convert to vendor
  const user = state.users[state.currentUser];
  if(user && user.role !== 'vendor'){
    user.role = 'vendor'; user.vendorId = vid;
  }
  saveState();
  closeModal('#vendor-modal');
  alert('Vendor registered (demo).');
  routeTo('vendors');
});

/* ---------- Settings actions ---------- */

function handleAvatarUpload(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const base = ev.target.result;
    // preview + save on save settings
    $('#set-avatar').dataset.preview = base;
  };
  reader.readAsDataURL(f);
}

function saveSettings(){
  const name = $('#set-name').value.trim();
  const newPin = $('#set-pin').value.trim();
  const preview = $('#set-avatar').dataset.preview;
  const user = state.users[state.currentUser];
  if(!user) return;
  if(name) user.name = name;
  if(preview) user.avatar = preview;
  if(newPin){
    if(!/^\d{4,6}$/.test(newPin)){ $('#settings-message').textContent = 'PIN must be 4-6 digits.'; return; }
    user.pin = newPin; // demo only: store in plain text
  }
  saveState();
  $('#settings-message').textContent = 'Settings saved.';
  setTimeout(()=> $('#settings-message').textContent = '', 2000);
}

/* ---------- Funding wallet (simulate) ---------- */
function openFundModal(){
  if(!state.currentUser){ openAuthModal(); return; }
  const amount = prompt('Enter amount to fund your wallet (numbers only):');
  const v = Number(amount);
  if(!v || v <= 0) { alert('Invalid amount'); return; }
  const user = state.users[state.currentUser];
  user.balance = (user.balance || 0) + v;
  const tx = { id: uid(), type:'fund', amount: v, date: new Date().toISOString() };
  state.txns[user.email] = state.txns[user.email] || [];
  state.txns[user.email].push(tx);
  saveState();
  renderDashboard($('#app'));
  alert('Wallet funded (demo).');
}

/* show transactions */
function showTransactions(email){
  const tx = state.txns[email] || [];
  let msg = 'Transactions:\n';
  if(tx.length === 0) msg += 'No transactions yet.';
  tx.forEach(t => msg += `${t.date} — ${t.type} — ${formatCurrency(t.amount)}\n`);
  alert(msg);
}

/* ---------- Modal closing handlers ---------- */
qs('[data-close]').forEach(btn => btn.addEventListener('click', closeAllModals));
$('#modal-backdrop').addEventListener('click', closeAllModals);

/* ---------- Initial bindings ---------- */
function attachNav(){
  qs('.main-nav a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const p = a.dataset.page;
      routeTo(p);
    });
  });

  $('#login-btn').addEventListener('click', openAuthModal);
  $('#logout-btn').addEventListener('click', ()=>{
    state.currentUser = null; saveState(); renderHeader(); routeTo('home');
  });
}

/* ---------- Start ---------- */
function start(){
  loadState();
  attachNav();
  renderApp();

  // add modal close buttons for dynamic items
  // fill product-click events via delegation (when store rendered)
  document.addEventListener('click', (e)=>{
    if(e.target.matches('.add-to-cart')){ /* already handled after renderProducts */ }
  });
}

start();
