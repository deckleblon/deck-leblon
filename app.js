/**
 * DECK LEBLON — CARDÁPIO — app.js
 * Funciona com Supabase quando configurado, ou com localStorage como fallback.
 */

(function () {
  'use strict';

  /* ─── Supabase / Storage helper ─────────────────────────────── */
  const db = window.deckSupabase;

  /* ─── LocalStorage fallback ──────────────────────────────────── */
  const LOCAL_KEY = 'deckleblon_menu';

  function localGet() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
    catch { return []; }
  }
  function localSave(items) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  }

  /* ─── CRUD ───────────────────────────────────────────────────── */
  async function fetchItems() {
    if (db.isConfigured) {
      const { data, error } = await db.client
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return localGet();
  }

  async function createItem(payload) {
    if (db.isConfigured) {
      const { data, error } = await db.client
        .from('menu_items')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const items = localGet();
    const newItem = { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    items.unshift(newItem);
    localSave(items);
    return newItem;
  }

  async function updateItem(id, payload) {
    if (db.isConfigured) {
      const { data, error } = await db.client
        .from('menu_items')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const items = localGet();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...payload };
      localSave(items);
      return items[idx];
    }
    throw new Error('Item não encontrado');
  }

  async function deleteItem(id) {
    if (db.isConfigured) {
      const { error } = await db.client
        .from('menu_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    }
    const items = localGet().filter(i => i.id !== id);
    localSave(items);
  }

  async function uploadImage(file) {
    if (db.isConfigured) {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await db.client.storage
        .from('menu-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data } = db.client.storage
        .from('menu-images')
        .getPublicUrl(path);
      return data.publicUrl;
    }
    // Fallback: base64
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  /* ─── Toast ──────────────────────────────────────────────────── */
  let toastTimer;
  function showToast(msg, type = 'success') {
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    clearTimeout(toastTimer);
    requestAnimationFrame(() => toast.classList.add('show'));
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  /* ─── MENU PAGE ──────────────────────────────────────────────── */
  if (document.getElementById('menuGrid')) {
    initMenuPage();
  }

  function initMenuPage() {
    const grid       = document.getElementById('menuGrid');
    const loading    = document.getElementById('loading');
    const emptyState = document.getElementById('emptyState');
    const filters    = document.getElementById('categoryFilters');
    const overlay    = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');

    let allItems = [];
    let activeCategory = 'all';

    // Hamburger
    const hamburger = document.getElementById('hamburger');
    const nav       = document.getElementById('nav');
    if (hamburger) {
      hamburger.addEventListener('click', () => nav.classList.toggle('open'));
    }

    // Modal
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });
    modalClose.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    function openModal(item) {
      document.getElementById('modalName').textContent  = item.name;
      document.getElementById('modalDesc').textContent  = item.description || 'Sem descrição.';
      document.getElementById('modalCat').textContent   = item.category;
      document.getElementById('modalPrice').textContent = formatPrice(item.price);
      const img = document.getElementById('modalImg');
      if (item.image_url) {
        img.src = item.image_url;
        img.style.display = 'block';
        document.querySelector('.modal-img-wrap').style.display = 'block';
      } else {
        img.style.display = 'none';
        document.querySelector('.modal-img-wrap').style.display = 'none';
      }
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Render
    function renderCards(items) {
      grid.innerHTML = '';
      if (!items.length) {
        emptyState.style.display = 'block';
        return;
      }
      emptyState.style.display = 'none';
      items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.style.animationDelay = `${i * 60}ms`;
        card.innerHTML = `
          <div class="card-img-wrap">
            ${item.image_url
              ? `<img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}" loading="lazy" />`
              : `<div class="card-no-img">🍽️</div>`
            }
            <span class="card-badge">${escHtml(item.category)}</span>
          </div>
          <div class="card-body">
            <h3 class="card-name">${escHtml(item.name)}</h3>
            ${item.description ? `<p class="card-desc">${escHtml(item.description)}</p>` : ''}
            <div class="card-footer">
              <span class="card-price">${formatPrice(item.price)}</span>
              <span class="card-view">Ver detalhes →</span>
            </div>
          </div>
        `;
        card.addEventListener('click', () => openModal(item));
        grid.appendChild(card);
      });
    }

    function renderFilters(items) {
      // Ordem fixa das categorias
      const ORDER = [
        'Petiscos',
        'Bebidas',
        'Bebidas Alcoólicas',
        'Bebidas Não Alcoólicas',
      ];

      const existing = [...new Set(items.map(i => i.category))];

      // Ordena: primeiro as que estão no ORDER, depois o resto alfabético
      const sorted = [
        ...ORDER.filter(c => existing.includes(c)),
        ...existing.filter(c => !ORDER.includes(c)).sort(),
      ];

      const bebidasCats = ['Bebidas Alcoólicas', 'Bebidas Não Alcoólicas'];
      const hasBebidas  = bebidasCats.some(c => existing.includes(c));

      filters.innerHTML = '';

      // Botão "Todos"
      const allBtn = document.createElement('button');
      allBtn.className = `filter-btn ${activeCategory === 'all' ? 'active' : ''}`;
      allBtn.dataset.cat = 'all';
      allBtn.textContent = 'Todos';
      filters.appendChild(allBtn);

      // Botão agrupado "Bebidas" (mostra alcoólicas + não alcoólicas juntas)
      if (hasBebidas) {
        const bebBtn = document.createElement('button');
        bebBtn.className = `filter-btn ${activeCategory === 'bebidas-grupo' ? 'active' : ''}`;
        bebBtn.dataset.cat = 'bebidas-grupo';
        bebBtn.textContent = '🥤 Bebidas';
        filters.appendChild(bebBtn);
      }

      sorted
        .filter(c => !bebidasCats.includes(c) || !hasBebidas)
        .forEach(cat => {
          // se tem grupo de bebidas, não mostra as sub-categorias soltas no topo
          if (hasBebidas && bebidasCats.includes(cat)) return;
          const btn = document.createElement('button');
          btn.className = `filter-btn ${activeCategory === cat ? 'active' : ''}`;
          btn.dataset.cat = cat;
          btn.textContent = cat;
          filters.appendChild(btn);
        });

      // Se tem bebidas, adiciona as sub-categorias indentadas
      if (hasBebidas) {
        bebidasCats.forEach(cat => {
          if (!existing.includes(cat)) return;
          const btn = document.createElement('button');
          btn.className = `filter-btn filter-sub ${activeCategory === cat ? 'active' : ''}`;
          btn.dataset.cat = cat;
          btn.textContent = cat === 'Bebidas Alcoólicas' ? '🍺 Alcoólicas' : '🧃 Não Alcoólicas';
          filters.appendChild(btn);
        });
      }

      filters.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeCategory = btn.dataset.cat;
          filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          let filtered;
          if (activeCategory === 'all') {
            filtered = allItems;
          } else if (activeCategory === 'bebidas-grupo') {
            filtered = allItems.filter(i => bebidasCats.includes(i.category));
          } else {
            filtered = allItems.filter(i => i.category === activeCategory);
          }
          renderCards(filtered);
        });
      });
    }

    async function load() {
      loading.style.display = 'flex';
      grid.innerHTML = '';
      try {
        allItems = await fetchItems();
        renderFilters(allItems);
        renderCards(allItems);
      } catch (err) {
        console.error(err);
        showToast('Erro ao carregar cardápio.', 'error');
      } finally {
        loading.style.display = 'none';
      }
    }

    load();
  }

  /* ─── ADMIN PAGE ─────────────────────────────────────────────── */
  if (document.getElementById('adminForm')) {
    initAdminPage();
  }

  function initAdminPage() {
    const form         = document.getElementById('adminForm');
    const submitBtn    = document.getElementById('submitBtn');
    const cancelBtn    = document.getElementById('cancelBtn');
    const itemsGrid    = document.getElementById('adminItemsGrid');
    const countEl      = document.getElementById('itemCount');
    const searchInput  = document.getElementById('adminSearch');
    const imgInput     = document.getElementById('imgInput');
    const imgPreview   = document.getElementById('imgPreview');
    const previewWrap  = document.getElementById('imgPreviewWrap');
    const uploadArea   = document.getElementById('uploadArea');

    // Hamburger
    const hamburger = document.getElementById('hamburger');
    const nav       = document.getElementById('nav');
    if (hamburger) {
      hamburger.addEventListener('click', () => nav.classList.toggle('open'));
    }

    let editingId   = null;
    let imageFile   = null;
    let imageUrl    = null;
    let allItems    = [];

    // Drag & drop
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) handleImageFile(f);
    });
    imgInput.addEventListener('change', () => {
      if (imgInput.files[0]) handleImageFile(imgInput.files[0]);
    });

    function handleImageFile(file) {
      imageFile = file;
      const reader = new FileReader();
      reader.onload = e => {
        imgPreview.src = e.target.result;
        previewWrap.classList.add('show');
      };
      reader.readAsDataURL(file);
    }

    // Search
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = q ? allItems.filter(i => i.name.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)) : allItems;
      renderAdminCards(filtered);
    });

    // Form submit
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name     = document.getElementById('itemName').value.trim();
      const category = document.getElementById('itemCategory').value.trim();
      const price    = parseFloat(document.getElementById('itemPrice').value);
      const desc     = document.getElementById('itemDesc').value.trim();

      if (!name || !category || isNaN(price)) {
        showToast('Preencha nome, categoria e preço.', 'error'); return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Salvando...`;

      try {
        // Upload imagem se houver
        if (imageFile) {
          imageUrl = await uploadImage(imageFile);
        }

        const payload = {
          name,
          category,
          price,
          description: desc,
          image_url:   imageUrl || null,
          available:   true,
        };

        if (editingId) {
          await updateItem(editingId, payload);
          showToast('Item atualizado com sucesso!');
        } else {
          await createItem(payload);
          showToast('Item adicionado ao cardápio!');
        }

        resetForm();
        await loadAdminItems();
      } catch (err) {
        console.error(err);
        showToast('Erro ao salvar item: ' + (err.message || err), 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = editingId ? 'Atualizar Item' : '+ Adicionar Item';
      }
    });

    // Cancel
    cancelBtn.addEventListener('click', resetForm);

    function resetForm() {
      editingId = null;
      imageFile = null;
      imageUrl  = null;
      form.reset();
      previewWrap.classList.remove('show');
      imgPreview.src = '';
      submitBtn.textContent = '+ Adicionar Item';
      document.getElementById('formTitle').textContent = 'Novo Item';
      cancelBtn.classList.remove('show');
      if (window.resetCatSelect) window.resetCatSelect();
    }

    function populateForm(item) {
      editingId = item.id;
      imageUrl  = item.image_url || null;
      document.getElementById('itemName').value  = item.name;
      document.getElementById('itemPrice').value = item.price;
      document.getElementById('itemDesc').value  = item.description || '';
      if (window.setCatSelect) window.setCatSelect(item.category);
      if (item.image_url) {
        imgPreview.src = item.image_url;
        previewWrap.classList.add('show');
      }
      submitBtn.textContent = 'Atualizar Item';
      document.getElementById('formTitle').textContent = 'Editar Item';
      cancelBtn.classList.add('show');
      document.getElementById('adminFormWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Render admin cards
    function renderAdminCards(items) {
      itemsGrid.innerHTML = '';
      countEl.textContent = `${items.length} ite${items.length !== 1 ? 'ns' : 'm'}`;
      if (!items.length) {
        itemsGrid.innerHTML = `<p style="color:var(--grey);grid-column:1/-1;padding:20px 0;">Nenhum item encontrado.</p>`;
        return;
      }
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'admin-item-card';
        card.innerHTML = `
          ${item.image_url
            ? `<img class="admin-card-img" src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}" loading="lazy" />`
            : `<div class="admin-card-no-img">🍽️</div>`
          }
          <div class="admin-card-body">
            <div class="admin-card-cat">${escHtml(item.category)}</div>
            <div class="admin-card-name">${escHtml(item.name)}</div>
            <div class="admin-card-price">${formatPrice(item.price)}</div>
            <div class="admin-card-actions">
              <button class="btn-edit" data-id="${item.id}">Editar</button>
              <button class="btn-delete" data-id="${item.id}">Excluir</button>
            </div>
          </div>
        `;
        card.querySelector('.btn-edit').addEventListener('click', () => populateForm(item));
        card.querySelector('.btn-delete').addEventListener('click', () => confirmDelete(item));
        itemsGrid.appendChild(card);
      });
    }

    async function confirmDelete(item) {
      if (!confirm(`Excluir "${item.name}"?`)) return;
      try {
        await deleteItem(item.id);
        showToast('Item excluído.');
        await loadAdminItems();
      } catch (err) {
        showToast('Erro ao excluir: ' + (err.message || err), 'error');
      }
    }

    async function loadAdminItems() {
      try {
        allItems = await fetchItems();
        renderAdminCards(allItems);
      } catch (err) {
        showToast('Erro ao carregar itens.', 'error');
      }
    }

    loadAdminItems();

    // Show config banner if not configured
    if (!db.isConfigured) {
      const banner = document.getElementById('configBanner');
      if (banner) banner.style.display = 'flex';
    }
  }

  /* ─── Utilities ──────────────────────────────────────────────── */
  function formatPrice(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
