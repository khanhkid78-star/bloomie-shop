/* Bloomie: Logic giao diện & Phân quyền 3 Role (Customer, Clerk, Admin) */

(function () {
    'use strict';

    /* ---------- tiện ích ---------- */
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    const money = n =>
        String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';

    const norm = s =>
        String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .toLowerCase();

    const esc = s =>
        String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));

    const ic = n => `<svg class="i"><use href="#i-${n}"/></svg>`;

    const LS = {
        get(k, d) {
            try {
                const v = localStorage.getItem(k);
                return v ? JSON.parse(v) : d;
            } catch (e) {
                return d;
            }
        },
        set(k, v) {
            try {
                localStorage.setItem(k, JSON.stringify(v));
            } catch (e) {}
        }
    };

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    async function sha(s) {
        try {
            const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
            return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            let h = 0;
            for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
            return 'x' + h;
        }
    }

    /* ---------- khởi tạo dữ liệu động (Products, Categories, Users, Orders) ---------- */
    function initStore() {
        // 1. Danh mục (categories)
        if (!LS.get('bl_categories', null)) {
            const cats = Object.entries(TAGS).map(([id, name]) => ({
                id,
                name,
                desc: 'Bộ sưu tập ' + name.toLowerCase() + ' tươi mới mỗi ngày'
            }));
            LS.set('bl_categories', cats);
        }

        // 2. Sản phẩm (products) - bổ sung stock mặc định nếu chưa có
        if (!LS.get('bl_products', null)) {
            const prods = P.map((p, idx) => ({
                ...p,
                stock: p.stock !== undefined ? p.stock : (idx % 4 === 0 ? 4 : 18),
                desc: DESC[p.id] || '',
                image_url: ''
            }));
            LS.set('bl_products', prods);
        }

        // 3. Tài khoản mặc định để test Admin & Clerk
        (async () => {
            const db = LS.get('bl_users', {});
            let changed = false;
            if (!db['admin@bloomie.vn']) {
                db['admin@bloomie.vn'] = {
                    name: 'Quản trị viên Bloomie',
                    phone: '0905000001',
                    address: 'Đà Nẵng',
                    hash: await sha('123456'),
                    role: 'admin'
                };
                changed = true;
            }
            if (!db['clerk@bloomie.vn']) {
                db['clerk@bloomie.vn'] = {
                    name: 'Nhân viên cửa hàng',
                    phone: '0905000002',
                    address: 'Đà Nẵng',
                    hash: await sha('123456'),
                    role: 'clerk'
                };
                changed = true;
            }
            if (changed) LS.set('bl_users', db);
        })();
    }
    initStore();

    const getProducts = () => LS.get('bl_products', []);
    const setProducts = list => LS.set('bl_products', list);
    const getCategories = () => LS.get('bl_categories', []);
    const setCategories = list => LS.set('bl_categories', list);
    const users = () => LS.get('bl_users', {});
    const orders = () => LS.get('bl_orders', []);

    const catMap = () => {
        const m = {};
        getCategories().forEach(c => { m[c.id] = c.name; });
        return m;
    };

    const byId = id => getProducts().find(p => p.id == id);
    const pct = p => (p.old && p.old > p.price) ? Math.round((1 - p.price / p.old) * 100) : 0;
    const stars = r => `<span class="stars" style="--p:${(r || 5) / 5 * 100}%" aria-hidden="true">★★★★★</span>`;

    // Hiển thị ảnh sản phẩm (hỗ trợ cả SVG mặc định lẫn image_url do Admin nhập)
    function prodVisual(p, opts = {}) {
        if (p.image_url) {
            return `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover;display:block">`;
        }
        const sp = p.sp || {
            paper: 'pink',
            ribbon: '#e07b95',
            bg: ['#f6e6e6', '#ead3d3'],
            alt: p.name,
            fl: [{ t: 'rose', p: 'pink', n: 9, r: 17 }, { t: 'baby', n: 4, r: 12 }]
        };
        return bouquet(sp, p.id || 1, opts);
    }

    /* ---------- trạng thái phiên ---------- */
    const S = {
        cart: LS.get('bl_cart', {}),
        favs: LS.get('bl_favs', []),
        coupon: LS.get('bl_coupon', ''),
        user: LS.get('bl_session', null)
    };

    if (S.user && !S.user.role) S.user.role = 'customer';

    const save = () => {
        LS.set('bl_cart', S.cart);
        LS.set('bl_favs', S.favs);
        LS.set('bl_coupon', S.coupon);
        LS.set('bl_session', S.user);
    };

    /* ---------- giá và giỏ hàng ---------- */
    const unit = (p, s) => Math.round(p.price * SIZES[s].m / 10000) * 10000;
    const unitOld = (p, s) => Math.round((p.old || p.price) * SIZES[s].m / 10000) * 10000;

    const cartLines = () =>
        Object.entries(S.cart)
            .filter(([k]) => byId(k.split('|')[0]))
            .map(([k, q]) => {
                const [id, s] = k.split('|'), p = byId(id);
                return { k, p, s, q, u: unit(p, s) };
            });

    function totals(express) {
        const L = cartLines(),
            sub = L.reduce((a, l) => a + l.u * l.q, 0),
            count = L.reduce((a, l) => a + l.q, 0);
        const disc = S.coupon === 'BLOOM10' ? Math.round(sub * 0.1) : 0;
        const after = sub - disc;
        const free = after >= 500000 || S.coupon === 'FREESHIP';
        const ship = !sub ? 0 : free ? 0 : 30000;
        const fast = express && sub ? 20000 : 0;
        return {
            sub, disc, after, ship, fast,
            total: after + ship + fast,
            count,
            left: Math.max(0, 500000 - after)
        };
    }

    let toastT;
    function toast(m) {
        const t = $('#toast');
        t.textContent = m;
        t.classList.add('on');
        clearTimeout(toastT);
        toastT = setTimeout(() => t.classList.remove('on'), 2600);
    }

    function bump(el) {
        if (!el) return;
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
    }

    function counts() {
        $('#cartN').textContent = totals().count;
        $('#favN').textContent = S.favs.length;
        const role = S.user ? (S.user.role || 'customer') : 'guest';
        const accHref = role === 'clerk' ? '#/clerk/dashboard' : role === 'admin' ? '#/admin/dashboard' : '#/tai-khoan';
        $('#btnAcc').setAttribute('href', accHref);
        $('#accTxt').innerHTML = S.user
            ? 'Xin chào<br>' + esc(S.user.name.split(' ').pop())
            : 'Đăng nhập<br>Đăng ký';
    }

    function addToCart(id, size, qty) {
        const p = byId(id);
        if (!p) return;
        const stock = Number(p.stock ?? 0);
        if (stock <= 0) {
            toast('Sản phẩm này hiện đã hết hàng');
            return;
        }
        const k = id + '|' + size;
        const nextQ = (S.cart[k] || 0) + qty;
        if (nextQ > stock) {
            toast(`Chỉ còn ${stock} sản phẩm trong kho`);
            S.cart[k] = stock;
        } else {
            S.cart[k] = Math.min(20, nextQ);
            toast('Đã thêm “' + p.name + '” vào giỏ hàng');
        }
        save();
        renderDrawer();
        bump($('#cartN'));
    }

    function changeQty(k, d) {
        const [id] = k.split('|');
        const p = byId(id);
        const maxStock = p ? Number(p.stock ?? 20) : 20;
        S.cart[k] = (S.cart[k] || 0) + d;
        if (S.cart[k] <= 0) delete S.cart[k];
        else if (S.cart[k] > maxStock) {
            S.cart[k] = maxStock;
            toast(`Kho chỉ còn ${maxStock} sản phẩm`);
        }
        save();
        renderDrawer();
    }

    /* ---------- cập nhật thanh điều hướng theo Role ---------- */
    const CUSTOMER_NAV_HTML = $('#mainNav').innerHTML;

    function syncRoleChrome() {
        const role = S.user ? (S.user.role || 'customer') : 'customer';
        const navEl = $('#mainNav');
        const logoEl = $('.logo');

        if (role === 'clerk') {
            document.body.classList.add('role-staff');
            logoEl.setAttribute('href', '#/clerk/dashboard');
            navEl.innerHTML = `
                <div class="wrap">
                    <ul>
                        <li><a class="n home" href="#/clerk/dashboard" data-nav="clerk-dashboard">${ic('home')}Tổng quan</a></li>
                        <li><a class="n" href="#/clerk/orders" data-nav="clerk-orders">Quản lý đơn hàng</a></li>
                        <li><a class="n" href="#/clerk/products" data-nav="clerk-products">Kho &amp; Sản phẩm</a></li>
                        <li style="margin-left:auto"><button class="n" type="button" data-logout>Đăng xuất (${esc(S.user.name)})</button></li>
                    </ul>
                </div>`;
        } else if (role === 'admin') {
            document.body.classList.add('role-staff');
            logoEl.setAttribute('href', '#/admin/dashboard');
            navEl.innerHTML = `
                <div class="wrap">
                    <ul>
                        <li><a class="n home" href="#/admin/dashboard" data-nav="admin-dashboard">${ic('home')}Tổng quan</a></li>
                        <li><a class="n" href="#/admin/products" data-nav="admin-products">Sản phẩm</a></li>
                        <li><a class="n" href="#/admin/categories" data-nav="admin-categories">Danh mục</a></li>
                        <li><a class="n" href="#/admin/users" data-nav="admin-users">Người dùng</a></li>
                        <li><a class="n" href="#/admin/orders" data-nav="admin-orders">Đơn hàng</a></li>
                        <li style="margin-left:auto"><button class="n" type="button" data-logout>Đăng xuất (${esc(S.user.name)})</button></li>
                    </ul>
                </div>`;
        } else {
            document.body.classList.remove('role-staff');
            logoEl.setAttribute('href', '#/');
            navEl.innerHTML = CUSTOMER_NAV_HTML;
        }
    }

    /* ---------- giỏ hàng nhanh (ngăn kéo) ---------- */
    function renderDrawer() {
        const L = cartLines(), T = totals();
        counts();

        if (!L.length) {
            $('#lines').innerHTML = `
                <div class="empty">
                    Giỏ hàng đang trống.<br>
                    <a class="cta" href="#/san-pham" data-close>Chọn hoa ngay</a>
                </div>`;
            $('#df').innerHTML = S.coupon
                ? `<div class="coupon"><span>Mã <b>${S.coupon}</b> đã sẵn sàng</span></div>`
                : '';
            return;
        }

        $('#lines').innerHTML = L.map(l => `
            <div class="ln">
                <div class="th">${prodVisual(l.p)}</div>
                <div>
                    <h4>${esc(l.p.name)}</h4>
                    <small class="hint">Cỡ ${SIZES[l.s].n}</small><br>
                    <b>${money(l.u)}</b>
                    <div class="row">
                        <div class="qty">
                            <button data-dec="${l.k}" aria-label="Giảm số lượng">${ic('minus')}</button>
                            <span>${l.q}</span>
                            <button data-inc="${l.k}" aria-label="Tăng số lượng">${ic('plus')}</button>
                        </div>
                        <button class="rm" data-rm="${l.k}">Xóa</button>
                    </div>
                </div>
            </div>`).join('');

        $('#df').innerHTML = `
            <div class="ship">
                ${T.left && S.coupon !== 'FREESHIP'
                    ? `Mua thêm ${money(T.left)} để được miễn phí giao hàng`
                    : 'Bạn được miễn phí giao hàng'}
                <div class="bar"><i style="width:${Math.min(100, T.after / 5000)}%"></i></div>
            </div>
            <div class="sum"><span>Tạm tính</span><span>${money(T.sub)}</span></div>
            ${T.disc ? `<div class="sum"><span>Giảm 10%</span><span>-${money(T.disc)}</span></div>` : ''}
            <button class="pay" data-checkout>Thanh toán</button>`;
    }

    function openDrawer() {
        $('#ov').classList.add('on');
        $('#drawer').classList.add('on');
        $('#drawer').setAttribute('aria-hidden', 'false');
    }

    function closeAll() {
        $('#drawer').classList.remove('on');
        $('#drawer').setAttribute('aria-hidden', 'true');
        $('#ov').classList.remove('on');
    }

    /* ---------- thành phần dùng chung ---------- */
    const favBtn = id => `
        <button class="fav${S.favs.includes(id) ? ' on' : ''}" data-fav="${id}" aria-pressed="${S.favs.includes(id)}" aria-label="Yêu thích">
            ${ic('heart')}
        </button>`;

    const card = p => {
        const out = Number(p.stock ?? 0) <= 0;
        return `
        <article class="card">
            <div class="pic">
                <a href="#/hoa/${p.id}" aria-label="${esc(p.name)}">${prodVisual(p)}</a>
                ${favBtn(p.id)}
            </div>
            <div class="info">
                <h3><a href="#/hoa/${p.id}">${esc(p.name)}</a></h3>
                <div class="pr">
                    <b>${money(p.price)}</b>
                    ${p.old > p.price ? `<s>${money(p.old)}</s><span class="off">-${pct(p)}%</span>` : ''}
                </div>
                <div class="rt">${stars(p.rate)}(${(p.rate || 5).toFixed(1)}) · Còn ${Number(p.stock ?? 0)}</div>
                <button class="btn-add" data-add="${p.id}" ${out ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
                    ${ic('cart')}${out ? 'Hết hàng' : 'Thêm vào giỏ'}
                </button>
            </div>
        </article>`;
    };

    const crumb = a => `
        <nav class="crumb" aria-label="Điều hướng">
            ${a.map((x, i) => i < a.length - 1 ? `<a href="${x[1]}">${x[0]}</a>${ic('right')}` : `<span aria-current="page">${x[0]}</span>`).join('')}
        </nav>`;

    const page = h => `<div class="wrap sec">${h}</div>`;
    const empty = (msg, btn) => `<div class="empty big2">${msg}<br>${btn || '<a class="cta" href="#/san-pham">Xem tất cả hoa</a>'}</div>`;

    const fld = (id, label, o = {}) => `
        <div class="fld ${o.full ? 'full' : ''}" data-f="${id}">
            <label for="${id}">${label}${o.req ? ' *' : ''}</label>
            ${o.tag === 'textarea'
                ? `<textarea id="${id}" name="${id}" ${o.attr || ''}>${esc(o.val || '')}</textarea>`
                : `<input id="${id}" name="${id}" type="${o.type || 'text'}" value="${esc(o.val || '')}" ${o.attr || ''}>`}
            <span class="err" aria-live="polite"></span>
        </div>`;

    function setErr(form, id, m) {
        const w = $(`[data-f="${id}"]`, form);
        if (!w) return;
        w.classList.toggle('bad', !!m);
        $('.err', w).textContent = m || '';
    }

    function validate(form, rules) {
        let first = null;
        for (const id in rules) {
            const m = rules[id](form.elements[id].value.trim());
            setErr(form, id, m);
            if (m && !first) first = id;
        }
        if (first) form.elements[first].focus();
        return !first;
    }

    const rPhone = v => /^(0|\+84)\d{9}$/.test(v.replace(/[\s.-]/g, '')) ? '' : 'Số điện thoại gồm 10 số, bắt đầu bằng 0';
    const rMail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Email chưa đúng định dạng';
    const rLen = (n, m) => v => v.length >= n ? '' : m;

    /* ---------- trang chủ Customer ---------- */
    function stripArt() {
        const R = rng(5);
        let s = `<svg viewBox="0 0 210 92" preserveAspectRatio="xMaxYMid meet">
            ${leaf(70, 92, 60, -30, G.d)}${leaf(110, 92, 64, 10, G.b)}${leaf(160, 92, 60, 40, G.d)}`;
        [[40, 60, 17], [78, 40, 19], [120, 56, 20], [160, 36, 17], [190, 62, 15], [100, 22, 13]]
            .forEach(([x, y, r], i) => { s += i % 2 ? daisy(x, y, r, i * 20) : lily(x, y, r + 4, i * 30); });
        return s + baby(60, 22, 12, R) + baby(145, 70, 12, R) + '</svg>';
    }

    function vHome() {
        const prods = getProducts();
        const catsList = getCategories();
        const slides = SLIDES.map((s, i) => `
            <article class="slide${i ? '' : ' on'}" aria-hidden="${i ? 'true' : 'false'}" aria-roledescription="slide" aria-label="${i + 1} trên ${SLIDES.length}">
                <div class="copy">
                    <p class="kicker">${s.k}</p>
                    <h2>${s.a}<em>${s.b}${ic('heart')}</em></h2>
                    <p class="d">${s.d}</p>
                    <a class="cta" href="#/san-pham?tag=${s.tag}" ${i ? 'tabindex="-1"' : ''}>Mua ngay${ic('arrow')}</a>
                </div>
                <div class="art">${bouquet(s.sp, i + 3, { hero: true, tag: i === 0 })}</div>
            </article>`).join('');

        const cats = catsList.map(c => `
            <a class="cat" role="listitem" href="#/san-pham?tag=${esc(c.id)}">
                <span class="c" style="background:${CATBG[c.id] || '#eef2e6'}">${ico(CATBG[c.id] ? c.id : 'sinhnhat')}</span>
                <span>${esc(c.name)}</span>
            </a>`).join('');

        const svc = [
            ['truck', 'Giao hoa nhanh', 'Trong 2 - 4 giờ tại Đà Nẵng'],
            ['shield', 'Hoa tươi mỗi ngày', 'Cam kết hoa luôn tươi mới'],
            ['gift', 'Thanh toán an toàn', 'Đa dạng hình thức thanh toán'],
            ['phone', 'Hỗ trợ 24/7', 'Luôn sẵn sàng hỗ trợ bạn']
        ].map(r => `<a href="#/dich-vu"><span class="ic">${ic(r[0])}</span><span><b>${r[1]}</b><small>${r[2]}</small></span><span class="go">${ic('right')}</span></a>`).join('');

        return `
        <div class="wrap">
            <section class="hero" aria-roledescription="carousel" aria-label="Hoa nổi bật">
                <svg class="leafart" viewBox="0 0 130 150" aria-hidden="true">
                    <path d="M20 140C20 90 50 45 100 20"/><path d="M42 98C28 90 24 74 30 62c14 4 22 18 12 36z"/>
                    <path d="M60 72C48 62 48 46 58 36c12 8 14 24 2 36z"/><path d="M82 48C74 36 78 22 90 16c8 10 6 24-8 32z"/>
                    <path d="M36 118C50 112 62 96 62 84"/><path d="M52 40l22 14"/>
                </svg>
                <div class="slides">${slides}</div>
                <button class="arrow prev" id="prev" aria-label="Slide trước">${ic('left')}</button>
                <button class="arrow next" id="next" aria-label="Slide sau">${ic('right')}</button>
                <div class="dots" id="dots">${SLIDES.map((_, i) => `<button class="${i ? '' : 'on'}" aria-label="Chuyển đến slide ${i + 1}" data-i="${i}"></button>`).join('')}</div>
            </section>
            <div class="cats" role="list" aria-label="Danh mục hoa">${cats}</div>
            <div class="layout">
                <div>
                    <section class="panel">
                        <div class="ph">${ic('flower')}<h2>Sản phẩm nổi bật</h2><a class="all" href="#/san-pham">Xem tất cả ${ic('arrow')}</a></div>
                        <div class="grid">${prods.slice(0, 4).map(card).join('')}</div>
                    </section>
                    <section class="strip" aria-label="Cam kết của Bloomie">
                        <div class="l">
                            <div class="tag">Hoa không chỉ là món quà, mà còn là cảm xúc…</div>
                            <ul>
                                <li>${ic('leaf')}Hoa tươi<br>chất lượng</li>
                                <li>${ic('heart')}Thiết kế<br>độc đáo</li>
                                <li>${ic('truck')}Giao hàng<br>đúng hẹn</li>
                                <li>${ic('shield')}Hỗ trợ<br>nhiệt tình</li>
                            </ul>
                        </div>
                        <div class="r" aria-hidden="true">${stripArt()}</div>
                    </section>
                </div>
                <aside class="aside">
                    <div class="panel svc">${svc}</div>
                    <div class="promo">
                        <h3>${ic('gift')}Ưu đãi đặc biệt</h3>
                        <p>Giảm ngay 10% cho đơn hàng đầu tiên</p>
                        <button class="cta" data-coupon="BLOOM10">Nhận ngay${ic('arrow')}</button>
                        <div class="art2" aria-hidden="true">${ico('tulip')}</div>
                    </div>
                </aside>
            </div>
        </div>`;
    }

    let heroT, cur = 0;
    function initHero() {
        const sl = $$('.slide');
        if (!sl.length) return;
        cur = 0;
        const go = i => {
            cur = (i + sl.length) % sl.length;
            sl.forEach((el, k) => {
                el.classList.toggle('on', k === cur);
                el.setAttribute('aria-hidden', k !== cur);
                $('.cta', el).tabIndex = k === cur ? 0 : -1;
            });
            $$('#dots button').forEach((b, k) => b.classList.toggle('on', k === cur));
        };
        const auto = () => {
            clearInterval(heroT);
            if (!reduce) heroT = setInterval(() => go(cur + 1), 6000);
        };
        $('#prev').onclick = () => { go(cur - 1); auto(); };
        $('#next').onclick = () => { go(cur + 1); auto(); };
        $('#dots').onclick = e => {
            const b = e.target.closest('button');
            if (b) { go(+b.dataset.i); auto(); }
        };
        const h = $('.hero');
        h.addEventListener('mouseenter', () => clearInterval(heroT));
        h.addEventListener('mouseleave', auto);
        auto();
    }

    /* ---------- danh sách sản phẩm ---------- */
    const PRICES = { '': 'Mọi mức giá', lt300: 'Dưới 300.000đ', m300: '300.000đ - 500.000đ', gt500: 'Trên 500.000đ' };
    const priceOk = (p, r) => !r || (r === 'lt300' && p.price < 300000) || (r === 'm300' && p.price >= 300000 && p.price <= 500000) || (r === 'gt500' && p.price > 500000);
    const SORTS = { '': 'Nổi bật', 'gia-tang': 'Giá tăng dần', 'gia-giam': 'Giá giảm dần', 'giam-gia': 'Giảm giá nhiều', 'danh-gia': 'Đánh giá cao' };

    function vList(q) {
        const prods = getProducts();
        const cats = catMap();
        const tag = cats[q.tag] ? q.tag : '',
            price = q.price || '',
            sort = q.sort || '',
            kw = (q.q || '').trim();

        let l = prods.filter(p =>
            (!tag || (p.tags || []).includes(tag)) &&
            priceOk(p, price) &&
            (!kw || norm(p.name + ' ' + (p.tags || []).map(t => cats[t] || '').join(' ')).includes(norm(kw)))
        );

        const cmp = {
            'gia-tang': (a, b) => a.price - b.price,
            'gia-giam': (a, b) => b.price - a.price,
            'giam-gia': (a, b) => pct(b) - pct(a),
            'danh-gia': (a, b) => (b.rate || 5) - (a.rate || 5)
        }[sort];
        if (cmp) l.sort(cmp);

        const href = o => {
            const m = { tag, price, sort, q: kw, ...o };
            const u = new URLSearchParams();
            for (const k in m) if (m[k]) u.set(k, m[k]);
            const s = u.toString();
            return '#/san-pham' + (s ? '?' + s : '');
        };

        const title = kw ? 'Kết quả cho “' + esc(kw) + '”' : tag ? cats[tag] : 'Tất cả sản phẩm';

        return page(`
            ${crumb(tag || kw ? [['Trang chủ', '#/'], ['Sản phẩm', '#/san-pham'], [title]] : [['Trang chủ', '#/'], ['Sản phẩm']])}
            <h1 class="page-t">${title}</h1>
            <div class="shop">
                <aside class="filters" aria-label="Bộ lọc">
                    <div class="grp">
                        <h3>Danh mục</h3>
                        <a href="${href({ tag: '' })}" class="${tag ? '' : 'on'}">Tất cả<small>${prods.length}</small></a>
                        ${Object.keys(cats).map(k => `
                            <a href="${href({ tag: k })}" class="${tag === k ? 'on' : ''}">
                                ${esc(cats[k])}<small>${prods.filter(p => (p.tags || []).includes(k)).length}</small>
                            </a>`).join('')}
                    </div>
                    <div class="grp">
                        <h3>Mức giá</h3>
                        ${Object.keys(PRICES).map(k => `<a href="${href({ price: k })}" class="${price === k ? 'on' : ''}">${PRICES[k]}</a>`).join('')}
                    </div>
                </aside>
                <div>
                    <div class="toolbar">
                        <span class="cnt">${l.length} sản phẩm</span>
                        <label>Sắp xếp
                            <select id="sortSel">${Object.keys(SORTS).map(k => `<option value="${k}" ${sort === k ? 'selected' : ''}>${SORTS[k]}</option>`).join('')}</select>
                        </label>
                    </div>
                    ${l.length ? `<div class="grid">${l.map(card).join('')}</div>` : empty('Không tìm thấy hoa phù hợp với bộ lọc.')}
                </div>
            </div>`);
    }

    /* ---------- chi tiết sản phẩm ---------- */
    let D = { id: 0, size: 'M', qty: 1 };

    function vDetail(id) {
        const p = byId(id);
        if (!p) return vNotFound();
        const cats = catMap();
        D = { id: p.id, size: 'M', qty: 1 };
        const rel = getProducts().filter(x => x.id !== p.id && (x.tags || []).some(t => (p.tags || []).includes(t))).slice(0, 4);
        const out = Number(p.stock ?? 0) <= 0;

        return page(`
            ${crumb([['Trang chủ', '#/'], ['Sản phẩm', '#/san-pham'], [p.name]])}
            <div class="detail">
                <div class="big">${prodVisual(p)}${favBtn(p.id)}</div>
                <div class="dinfo">
                    <h1>${esc(p.name)}</h1>
                    <div class="rt">${stars(p.rate)}<span>${(p.rate || 5).toFixed(1)} / 5 · Tồn kho: <b>${Number(p.stock ?? 0)}</b></span></div>
                    <div class="pr" style="margin-top:10px">
                        <b id="dpr">${money(p.price)}</b>
                        ${p.old > p.price ? `<s id="dold">${money(p.old)}</s><span class="off">-${pct(p)}%</span>` : '<s id="dold"></s>'}
                    </div>
                    <p class="desc">${esc(p.desc || DESC[p.id] || '')}</p>
                    <div>${(p.tags || []).map(t => `<a class="chip" href="#/san-pham?tag=${t}" style="margin:0 6px 6px 0;padding:3px 12px">${esc(cats[t] || t)}</a>`).join('')}</div>
                    <h4>Chọn kích cỡ</h4>
                    <div class="opt" id="sizes">
                        ${Object.keys(SIZES).map(k => `<button type="button" data-size="${k}" aria-pressed="${k === 'M'}">${SIZES[k].n}<small>${SIZES[k].note}</small></button>`).join('')}
                    </div>
                    <h4>Số lượng</h4>
                    <div class="qty lg">
                        <button data-dq="-1" aria-label="Giảm">${ic('minus')}</button>
                        <span id="dq">1</span>
                        <button data-dq="1" aria-label="Tăng">${ic('plus')}</button>
                    </div>
                    <div class="buy">
                        <button class="btn" data-addd ${out ? 'disabled style="opacity:.5"' : ''}>${ic('cart')}${out ? 'Hết hàng' : 'Thêm vào giỏ'}</button>
                        <button class="btn o" data-buy ${out ? 'disabled style="opacity:.5"' : ''}>Mua ngay</button>
                    </div>
                    <div class="facts">
                        <details open><summary>Giao hàng</summary><p>Giao trong 2 - 4 giờ tại Đà Nẵng, hoặc hẹn khung giờ bạn muốn. Miễn phí giao hàng cho đơn từ 500.000đ.</p></details>
                        <details><summary>Cách bảo quản</summary><ul>${CARE.map(c => `<li>${c}</li>`).join('')}</ul></details>
                    </div>
                </div>
            </div>
            ${rel.length ? `<section class="panel"><div class="ph">${ic('flower')}<h2>Có thể bạn cũng thích</h2></div><div class="grid">${rel.map(card).join('')}</div></section>` : ''}`);
    }

    function updateDetail() {
        const p = byId(D.id);
        if (!p) return;
        $('#dpr').textContent = money(unit(p, D.size));
        $('#dold').textContent = p.old > p.price ? money(unitOld(p, D.size)) : '';
        $('#dq').textContent = D.qty;
        $$('[data-size]').forEach(b => b.setAttribute('aria-pressed', b.dataset.size === D.size));
    }

    /* ---------- thanh toán ---------- */
    function sumHTML(express) {
        const L = cartLines(), T = totals(express);
        return L.map(l => `
            <div class="sl">
                <div class="th">${prodVisual(l.p)}</div>
                <div>
                    <h4>${esc(l.p.name)}</h4>
                    <small>Cỡ ${SIZES[l.s].n}</small>
                    <div class="qty">
                        <button type="button" data-cdec="${l.k}" aria-label="Giảm">${ic('minus')}</button>
                        <span>${l.q}</span>
                        <button type="button" data-cinc="${l.k}" aria-label="Tăng">${ic('plus')}</button>
                    </div>
                </div>
                <div style="text-align:right">
                    <b style="color:var(--price)">${money(l.u * l.q)}</b><br>
                    <button type="button" class="rm" data-crm="${l.k}">Xóa</button>
                </div>
            </div>`).join('')
            + (S.coupon
                ? `<div class="coupon" style="margin-top:12px"><span>Mã <b>${S.coupon}</b>: ${COUPONS[S.coupon]}</span><button type="button" class="rm" data-coff>Bỏ mã</button></div>`
                : `<div class="cp"><input id="cin" placeholder="Mã giảm giá (thử BLOOM10)" aria-label="Mã giảm giá"><button type="button" class="btn o" data-capply>Áp dụng</button></div>`)
            + `<div class="sum"><span>Tạm tính</span><span>${money(T.sub)}</span></div>
               ${T.disc ? `<div class="sum"><span>Giảm 10%</span><span>-${money(T.disc)}</span></div>` : ''}
               <div class="sum"><span>Phí giao hàng</span><span>${T.ship ? money(T.ship) : 'Miễn phí'}</span></div>
               ${T.fast ? `<div class="sum"><span>Giao nhanh 2 - 4 giờ</span><span>${money(T.fast)}</span></div>` : ''}
               <div class="sum t"><span>Tổng cộng</span><b>${money(T.total)}</b></div>
               <p class="hint">${T.left && S.coupon !== 'FREESHIP' ? `Mua thêm ${money(T.left)} để được miễn phí giao hàng.` : ''}</p>`;
    }

    function vCheckout() {
        if (!cartLines().length) {
            return page(crumb([['Trang chủ', '#/'], ['Thanh toán']]) + empty('Giỏ hàng của bạn đang trống.'));
        }
        const u = S.user || {}, today = new Date().toLocaleDateString('sv-SE');
        return page(`
            ${crumb([['Trang chủ', '#/'], ['Thanh toán']])}
            <h1 class="page-t">Thanh toán</h1>
            <div class="co">
                <form id="coForm" data-form="checkout" novalidate>
                    <div class="box">
                        <h2>Thông tin người nhận</h2>
                        <div class="g2">
                            ${fld('name', 'Họ và tên', { req: 1, val: u.name, attr: 'autocomplete="name"' })}
                            ${fld('phone', 'Số điện thoại', { req: 1, type: 'tel', val: u.phone, attr: 'autocomplete="tel"' })}
                            ${fld('email', 'Email (không bắt buộc)', { type: 'email', val: u.email, full: 1 })}
                            ${fld('address', 'Địa chỉ giao hoa', { req: 1, val: u.address, attr: 'placeholder="Số nhà, đường, phường, quận"', full: 1 })}
                        </div>
                    </div>
                    <div class="box">
                        <h2>Thời gian giao</h2>
                        <div class="g2">
                            ${fld('date', 'Ngày giao', { req: 1, type: 'date', val: today, attr: `min="${today}"` })}
                            <div class="fld" data-f="slot">
                                <label for="slot">Khung giờ</label>
                                <select id="slot" name="slot">${SLOTS.map(s => `<option>${s}</option>`).join('')}</select>
                                <span class="err"></span>
                            </div>
                        </div>
                        <label class="chk"><input type="checkbox" id="express" name="express"><span>Giao nhanh trong 2 - 4 giờ <small class="hint">(+20.000đ)</small></span></label>
                    </div>
                    <div class="box">
                        <h2>Lời nhắn</h2>
                        ${fld('msg', 'Nội dung thiệp kèm hoa', { tag: 'textarea', attr: 'maxlength="160" placeholder="Ví dụ: Chúc mẹ luôn khỏe và vui nhé!"' })}
                        ${fld('note', 'Ghi chú cho người giao', { tag: 'textarea', attr: 'maxlength="200"' })}
                    </div>
                    <div class="box">
                        <h2>Hình thức thanh toán</h2>
                        <div class="pick">
                            <label><input type="radio" name="pay" value="cod" checked><span>Thanh toán khi nhận hoa<small>Trả tiền mặt cho người giao hàng</small></span></label>
                            <label><input type="radio" name="pay" value="bank"><span>Chuyển khoản ngân hàng<small>Thông tin chuyển khoản sẽ gửi sau khi đặt hàng</small></span></label>
                            <label><input type="radio" name="pay" value="wallet"><span>Ví điện tử<small>Bản demo, chưa kết nối cổng thanh toán</small></span></label>
                        </div>
                    </div>
                </form>
                <aside class="box summary">
                    <h2>Đơn hàng của bạn</h2>
                    <div id="sumBox">${sumHTML(false)}</div>
                    <button class="pay" type="submit" form="coForm" style="width:100%">Đặt hàng</button>
                </aside>
            </div>`);
    }

    function placeOrder(form) {
        const ok = validate(form, {
            name: rLen(2, 'Vui lòng nhập họ tên'),
            phone: rPhone,
            address: rLen(8, 'Vui lòng nhập địa chỉ đầy đủ'),
            date: v => !v ? 'Chọn ngày giao' : v < new Date().toLocaleDateString('sv-SE') ? 'Ngày giao không được ở quá khứ' : ''
        });
        const mail = form.elements.email.value.trim();
        if (mail && rMail(mail)) {
            setErr(form, 'email', rMail(mail));
            form.elements.email.focus();
            return;
        }
        if (!ok) return;

        const L = cartLines();
        if (!L.length) return;

        // Kiểm tra & trừ tồn kho (stock) tự động theo yêu cầu SQL Mapping
        const prods = getProducts();
        for (const l of L) {
            const p = prods.find(x => x.id == l.p.id);
            if (!p || Number(p.stock ?? 0) < l.q) {
                toast(`Sản phẩm "${l.p.name}" không đủ số lượng trong kho`);
                return;
            }
        }
        for (const l of L) {
            const p = prods.find(x => x.id == l.p.id);
            p.stock = Math.max(0, Number(p.stock ?? 0) - l.q);
        }
        setProducts(prods);

        const express = form.elements.express.checked,
            T = totals(express),
            f = form.elements;

        const o = {
            id: 'BL' + Date.now().toString(36).toUpperCase().slice(-6),
            created: Date.now(),
            email: S.user ? S.user.email : '',
            name: f.name.value.trim(),
            phone: f.phone.value.trim(),
            contact: mail,
            address: f.address.value.trim(),
            date: f.date.value,
            slot: f.slot.value,
            express,
            msg: f.msg.value.trim(),
            note: f.note.value.trim(),
            pay: f.pay.value,
            coupon: S.coupon,
            status: 'Pending',
            cancelled: false,
            items: L.map(l => ({ id: l.p.id, name: l.p.name, size: l.s, q: l.q, u: l.u })),
            totals: T
        };

        LS.set('bl_orders', [o, ...orders()]);
        S.cart = {};
        S.coupon = '';
        save();
        counts();
        renderDrawer();
        location.hash = '#/don-hang/' + o.id;
    }

    /* ---------- đơn hàng ---------- */
    const STATUS_LABELS = {
        Pending: ['Chờ xử lý', ''],
        Processing: ['Đang cắm hoa', ''],
        Shipping: ['Đang giao', ''],
        Completed: ['Hoàn tất', 'ok2'],
        Cancelled: ['Đã hủy', 'no']
    };

    const STATUS_STEP = { Pending: 0, Processing: 1, Shipping: 2, Completed: 3 };
    const STEPS = ['Chờ xử lý', 'Đang cắm hoa', 'Đang giao', 'Hoàn tất'];
    const PAYS = { cod: 'Thanh toán khi nhận hoa', bank: 'Chuyển khoản ngân hàng', wallet: 'Ví điện tử' };

    const statusOf = o => {
        if (o.cancelled || o.status === 'Cancelled') return ['Đã hủy', 'no'];
        if (o.status && STATUS_LABELS[o.status]) return STATUS_LABELS[o.status];
        return ['Chờ xử lý', ''];
    };

    const dt = ts => new Date(ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    const fdate = s => s.split('-').reverse().join('/');

    function vOrder(id) {
        const o = orders().find(x => x.id === id);
        if (!o) {
            return page(crumb([['Trang chủ', '#/'], ['Đơn hàng']]) + empty('Không tìm thấy đơn hàng ' + esc(id) + '.', '<a class="cta" href="#/tai-khoan">Tra cứu đơn hàng</a>'));
        }
        const [st, cls] = statusOf(o), T = o.totals, fresh = Date.now() - o.created < 30000;
        const curStep = STATUS_STEP[o.status] ?? 0;

        return page(`
            ${crumb([['Trang chủ', '#/'], ['Tài khoản', '#/tai-khoan'], ['Đơn ' + o.id]])}
            ${fresh && !o.cancelled ? `<div class="done"><div class="tick">${ic('shield')}</div><h1 class="page-t" style="margin-bottom:6px">Đặt hàng thành công</h1><p class="lead" style="margin:0 auto 10px">Bloomie đã nhận đơn <b>${o.id}</b> và sẽ liên hệ xác nhận qua số ${esc(o.phone)}.</p></div>` : `<h1 class="page-t">Đơn hàng ${o.id}</h1>`}
            <div class="co">
                <div>
                    <div class="box">
                        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
                            <h2 style="margin:0">Tiến độ</h2><span class="st ${cls}">${st}</span>
                        </div>
                        ${o.cancelled || o.status === 'Cancelled'
                            ? `<p class="hint">Đơn hàng này đã được hủy.</p>`
                            : `<ol class="tl">${STEPS.map((s, i) => `<li class="${i <= curStep ? 'on' : ''}">${s}</li>`).join('')}</ol>`}
                    </div>
                    <div class="box">
                        <h2>Thông tin giao hàng</h2>
                        <dl class="kv">
                            <dt>Người nhận</dt><dd>${esc(o.name)}</dd>
                            <dt>Điện thoại</dt><dd>${esc(o.phone)}</dd>
                            <dt>Địa chỉ</dt><dd>${esc(o.address)}</dd>
                            <dt>Thời gian</dt><dd>${fdate(o.date)}, ${o.express ? 'giao nhanh 2 - 4 giờ' : o.slot}</dd>
                            <dt>Thanh toán</dt><dd>${PAYS[o.pay]}</dd>
                            ${o.msg ? `<dt>Lời nhắn</dt><dd>${esc(o.msg)}</dd>` : ''}
                            ${o.note ? `<dt>Ghi chú</dt><dd>${esc(o.note)}</dd>` : ''}
                            <dt>Đặt lúc</dt><dd>${dt(o.created)}</dd>
                        </dl>
                    </div>
                </div>
                <aside class="box summary">
                    <h2>Sản phẩm</h2>
                    ${o.items.map(i => {
                        const p = byId(i.id);
                        return `<div class="sl"><div class="th">${p ? prodVisual(p) : ''}</div><div><h4>${esc(i.name)}</h4><small>Cỡ ${SIZES[i.size].n} · SL ${i.q}</small></div><b style="color:var(--price)">${money(i.u * i.q)}</b></div>`;
                    }).join('')}
                    <div class="sum" style="margin-top:10px"><span>Tạm tính</span><span>${money(T.sub)}</span></div>
                    ${T.disc ? `<div class="sum"><span>Giảm giá</span><span>-${money(T.disc)}</span></div>` : ''}
                    <div class="sum"><span>Phí giao hàng</span><span>${T.ship + T.fast ? money(T.ship + T.fast) : 'Miễn phí'}</span></div>
                    <div class="sum t"><span>Tổng cộng</span><b>${money(T.total)}</b></div>
                    ${!o.cancelled && o.status !== 'Cancelled' && curStep < 2 ? `<button class="btn o" style="width:100%;margin-top:12px" data-cancel="${o.id}">Hủy đơn hàng</button>` : ''}
                </aside>
            </div>`);
    }

    /* ---------- tài khoản ---------- */
    function vAccount() {
        if (!S.user) {
            return page(`
                ${crumb([['Trang chủ', '#/'], ['Tài khoản']])}
                <h1 class="page-t">Tài khoản</h1>
                <p class="lead">Đăng nhập để mua sắm, theo dõi đơn hàng hoặc truy cập khu vực nhân viên/quản trị.</p>
                <div class="acc">
                    <form class="box" data-form="login" novalidate>
                        <h2>Đăng nhập</h2>
                        ${fld('lemail', 'Email', { req: 1, type: 'email' })}
                        ${fld('lpass', 'Mật khẩu', { req: 1, type: 'password' })}
                        <button class="btn" type="submit" style="width:100%">Đăng nhập</button>
                        <p class="hint" style="margin-top:10px">
                            Tài khoản mẫu: <b>admin@bloomie.vn</b> / <b>123456</b> (Admin) hoặc <b>clerk@bloomie.vn</b> / <b>123456</b> (Nhân viên).
                        </p>
                    </form>
                    <form class="box" data-form="register" novalidate>
                        <h2>Tạo tài khoản khách hàng</h2>
                        ${fld('rname', 'Họ và tên', { req: 1 })}
                        ${fld('remail', 'Email', { req: 1, type: 'email' })}
                        ${fld('rpass', 'Mật khẩu (ít nhất 6 ký tự)', { req: 1, type: 'password' })}
                        <button class="btn" type="submit" style="width:100%">Đăng ký</button>
                    </form>
                </div>`);
        }

        const u = S.user, mine = orders().filter(o => o.email === u.email);
        return page(`
            ${crumb([['Trang chủ', '#/'], ['Tài khoản']])}
            <h1 class="page-t">Xin chào, ${esc(u.name)}</h1>
            <div class="acc">
                <form class="box" data-form="profile" novalidate>
                    <h2>Thông tin cá nhân</h2>
                    ${fld('pname', 'Họ và tên', { req: 1, val: u.name })}
                    ${fld('pemail', 'Email', { type: 'email', val: u.email, attr: 'readonly' })}
                    ${fld('pphone', 'Số điện thoại', { type: 'tel', val: u.phone })}
                    ${fld('paddr', 'Địa chỉ giao hoa', { val: u.address })}
                    <div class="buy" style="margin-top:4px">
                        <button class="btn" type="submit">Lưu thay đổi</button>
                        <button class="btn o" type="button" data-logout>Đăng xuất</button>
                    </div>
                </form>
                <div class="box">
                    <h2>Lịch sử đơn hàng của bạn</h2>
                    ${mine.length ? mine.map(ordRow).join('') : `<p class="hint">Bạn chưa có đơn hàng nào.</p><a class="cta" href="#/san-pham">Chọn hoa ngay</a>`}
                </div>
            </div>`);
    }

    const ordRow = o => {
        const [st, cls] = statusOf(o);
        return `
        <div class="ord">
            <div>
                <a href="#/don-hang/${o.id}">${o.id}</a>
                <small>${dt(o.created)} · ${o.items.reduce((a, i) => a + i.q, 0)} sản phẩm</small>
            </div>
            <div style="text-align:right">
                <b>${money(o.totals.total)}</b><br>
                <span class="st ${cls}">${st}</span>
            </div>
        </div>`;
    };

    async function doAuth(form, kind) {
        const f = form.elements, db = users();
        if (kind === 'register') {
            if (!validate(form, {
                rname: rLen(2, 'Vui lòng nhập họ tên'),
                remail: rMail,
                rpass: rLen(6, 'Mật khẩu ít nhất 6 ký tự')
            })) return;

            const em = f.remail.value.trim().toLowerCase();
            if (db[em]) { setErr(form, 'remail', 'Email này đã được đăng ký'); return; }

            db[em] = { name: f.rname.value.trim(), phone: '', address: '', hash: await sha(f.rpass.value), role: 'customer' };
            LS.set('bl_users', db);
            S.user = { email: em, name: db[em].name, phone: '', address: '', role: 'customer' };
            toast('Tạo tài khoản thành công');
        } else {
            if (!validate(form, { lemail: rMail, lpass: rLen(1, 'Nhập mật khẩu') })) return;
            const em = f.lemail.value.trim().toLowerCase(), u = db[em];
            if (!u || u.hash !== await sha(f.lpass.value)) {
                setErr(form, 'lpass', 'Email hoặc mật khẩu chưa đúng');
                return;
            }
            S.user = { email: em, name: u.name, phone: u.phone, address: u.address, role: u.role || 'customer' };
            toast('Đăng nhập thành công');
        }
        save();
        counts();
        if (S.user.role === 'clerk') location.hash = '#/clerk/dashboard';
        else if (S.user.role === 'admin') location.hash = '#/admin/dashboard';
        else route();
    }

    /* ---------- các trang phụ Customer ---------- */
    function vFav() {
        const l = S.favs.map(byId).filter(Boolean);
        return page(`${crumb([['Trang chủ', '#/'], ['Yêu thích']])}<h1 class="page-t">Sản phẩm yêu thích</h1>${l.length ? `<div class="grid fav4">${l.map(card).join('')}</div>` : empty('Bạn chưa chọn sản phẩm nào.')}`);
    }

    function vContact() {
        return page(`
            ${crumb([['Trang chủ', '#/'], ['Liên hệ']])}
            <h1 class="page-t">Liên hệ Bloomie</h1>
            <form class="box" data-form="contact" novalidate style="max-width:640px">
                ${fld('cname', 'Họ và tên', { req: 1, val: S.user && S.user.name })}
                ${fld('cmail', 'Email', { req: 1, type: 'email', val: S.user && S.user.email })}
                ${fld('cmsg', 'Nội dung', { req: 1, tag: 'textarea', attr: 'rows="4"' })}
                <button class="btn" type="submit">Gửi lời nhắn</button>
            </form>`);
    }

    function vService() {
        const r = [
            ['truck', 'Giao hoa nhanh', 'Giao trong 2 - 4 giờ tại Đà Nẵng.'],
            ['shield', 'Hoa tươi mỗi ngày', 'Hoa được cắm trong ngày.'],
            ['gift', 'Thanh toán an toàn', 'Thanh toán khi nhận hoa, chuyển khoản hoặc ví điện tử.'],
            ['phone', 'Hỗ trợ 24/7', 'Gửi lời nhắn ở trang liên hệ bất cứ lúc nào.']
        ];
        return page(`${crumb([['Trang chủ', '#/'], ['Dịch vụ']])}<h1 class="page-t">Dịch vụ của Bloomie</h1><div class="svc-page">${r.map(x => `<div class="box"><div class="ic">${ic(x[0])}</div><h2>${x[1]}</h2><p>${x[2]}</p></div>`).join('')}</div>`);
    }

    function vNotFound() {
        return page(crumb([['Trang chủ', '#/'], ['Không tìm thấy']]) + empty('Trang bạn tìm không tồn tại.', '<a class="cta" href="#/">Về trang chủ</a>'));
    }

    /* ==========================================================================
       GIAO DIỆN 2: CLERK (NHÂN VIÊN VẬN HÀNH)
       ========================================================================== */
    function vClerkDashboard() {
        const allOrders = orders();
        const todayStr = new Date().toLocaleDateString('sv-SE');
        const pending = allOrders.filter(o => !o.cancelled && (o.status === 'Pending' || o.status === 'Processing'));
        const todayOrders = allOrders.filter(o => new Date(o.created).toLocaleDateString('sv-SE') === todayStr);
        const lowStock = getProducts().filter(p => Number(p.stock ?? 0) <= 5);

        return page(`
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin:16px 0">
                <div>
                    <span class="role-pill">Nhân viên (Clerk)</span>
                    <h1 class="page-t" style="margin:6px 0 0">Bảng điều khiển vận hành</h1>
                </div>
                <div style="display:flex;gap:10px">
                    <a class="btn" href="#/clerk/orders">Xử lý đơn hàng</a>
                    <a class="btn o" href="#/clerk/products">Kiểm tra kho</a>
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card warn"><span>Đơn chờ xử lý</span><b>${pending.length}</b></div>
                <div class="kpi-card"><span>Đơn hàng hôm nay</span><b>${todayOrders.length}</b></div>
                <div class="kpi-card warn"><span>Sản phẩm sắp hết hàng (≤ 5)</span><b>${lowStock.length}</b></div>
                <div class="kpi-card"><span>Tổng đơn hệ thống</span><b>${allOrders.length}</b></div>
            </div>

            <div class="box">
                <h2>Cảnh báo sản phẩm sắp hết hàng</h2>
                ${lowStock.length ? `
                <div class="tbl-wrap">
                    <table class="tbl">
                        <tr><th>Mã SP</th><th>Tên hoa</th><th>Tồn kho</th><th>Thao tác</th></tr>
                        ${lowStock.map(p => `
                            <tr>
                                <td>#${p.id}</td>
                                <td><b>${esc(p.name)}</b></td>
                                <td><span class="st no" style="color:var(--price)">Còn ${Number(p.stock ?? 0)}</span></td>
                                <td><a class="btn btn-sm" href="#/clerk/products">Nhập thêm kho</a></td>
                            </tr>`).join('')}
                    </table>
                </div>` : '<p class="hint">Tất cả sản phẩm đều còn đủ số lượng tồn kho.</p>'}
            </div>`);
    }

    function vClerkOrders(q = {}) {
        const filterSt = q.status || '';
        const list = orders().filter(o => {
            const st = o.cancelled ? 'Cancelled' : (o.status || 'Pending');
            return !filterSt || st === filterSt;
        });

        return page(`
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin:16px 0">
                <div>
                    <span class="role-pill">Nhân viên</span>
                    <h1 class="page-t" style="margin:6px 0 0">Quản lý &amp; tiếp nhận đơn hàng</h1>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    ${['', 'Pending', 'Processing', 'Shipping', 'Completed', 'Cancelled'].map(st => `
                        <a class="btn btn-sm ${filterSt === st ? '' : 'o'}" href="#/clerk/orders${st ? '?status=' + st : ''}">
                            ${st ? STATUS_LABELS[st][0] : 'Tất cả'}
                        </a>`).join('')}
                </div>
            </div>

            <div class="tbl-wrap">
                <table class="tbl">
                    <tr>
                        <th>Mã đơn</th>
                        <th>Khách nhận &amp; Giao hàng</th>
                        <th>Chi tiết bó hoa cần gói</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th>Cập nhật tiến độ</th>
                    </tr>
                    ${list.length ? list.map(o => {
                        const curSt = o.cancelled ? 'Cancelled' : (o.status || 'Pending');
                        const [stTxt, stCls] = statusOf(o);
                        return `
                        <tr>
                            <td><b>${esc(o.id)}</b><br><small class="hint">${dt(o.created)}</small></td>
                            <td>
                                <b>${esc(o.name)}</b> - ${esc(o.phone)}<br>
                                <small>${esc(o.address)}</small><br>
                                <small class="ok">Giao: ${fdate(o.date)} (${o.express ? 'Nhanh 2-4h' : o.slot})</small>
                                ${o.msg ? `<div class="ord-detail-box"><b>Thiệp:</b> ${esc(o.msg)}</div>` : ''}
                            </td>
                            <td>
                                ${o.items.map(i => `<div>• <b>${esc(i.name)}</b> (Cỡ ${SIZES[i.size]?.n || i.size}) × <b>${i.q}</b></div>`).join('')}
                            </td>
                            <td><b style="color:var(--price)">${money(o.totals.total)}</b></td>
                            <td><span class="st ${stCls}">${stTxt}</span></td>
                            <td>
                                <select data-order-status="${esc(o.id)}">
                                    <option value="Pending" ${curSt === 'Pending' ? 'selected' : ''}>Chờ xử lý</option>
                                    <option value="Processing" ${curSt === 'Processing' ? 'selected' : ''}>Đang cắm hoa</option>
                                    <option value="Shipping" ${curSt === 'Shipping' ? 'selected' : ''}>Đang giao</option>
                                    <option value="Completed" ${curSt === 'Completed' ? 'selected' : ''}>Hoàn tất</option>
                                    <option value="Cancelled" ${curSt === 'Cancelled' ? 'selected' : ''}>Đã hủy</option>
                                </select>
                            </td>
                        </tr>`;
                    }).join('') : `<tr><td colspan="6" style="text-align:center;padding:24px">Không có đơn hàng nào ở trạng thái này.</td></tr>`}
                </table>
            </div>`);
    }

    function vClerkProducts() {
        const cats = catMap();
        return page(`
            <div style="margin:16px 0">
                <span class="role-pill">Nhân viên</span>
                <h1 class="page-t" style="margin:6px 0 0">Quản lý tồn kho sản phẩm</h1>
            </div>
            <div class="tbl-wrap">
                <table class="tbl">
                    <tr>
                        <th>Mã</th>
                        <th>Sản phẩm</th>
                        <th>Danh mục</th>
                        <th>Giá bán</th>
                        <th>Tình trạng kho</th>
                        <th>Cập nhật số lượng nhập</th>
                    </tr>
                    ${getProducts().map(p => {
                        const st = Number(p.stock ?? 0);
                        return `
                        <tr>
                            <td>#${p.id}</td>
                            <td><b>${esc(p.name)}</b></td>
                            <td>${(p.tags || []).map(t => cats[t] || t).join(', ')}</td>
                            <td>${money(p.price)}</td>
                            <td>
                                ${st <= 5
                                    ? `<span class="st no" style="color:var(--price)">Sắp hết (${st})</span>`
                                    : `<span class="st ok2">Còn hàng (${st})</span>`}
                            </td>
                            <td style="white-space:nowrap">
                                <input type="number" min="0" value="${st}" data-stock="${p.id}" style="width:84px;padding:7px 10px;border:1px solid var(--line);border-radius:8px">
                                <button class="btn btn-sm" data-save-stock="${p.id}">Cập nhật</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </table>
            </div>`);
    }

    /* ==========================================================================
       GIAO DIỆN 3: ADMIN (QUẢN TRỊ VIÊN TOÀN QUYỀN)
       ========================================================================== */
    function vAdminDashboard() {
        const allOrders = orders();
        const validOrders = allOrders.filter(o => !o.cancelled && o.status !== 'Cancelled');
        const revenue = validOrders.reduce((s, o) => s + Number(o.totals.total || 0), 0);
        const db = users();

        // Thống kê doanh thu theo ngày (7 ngày gần nhất có dữ liệu)
        const byDay = {};
        validOrders.forEach(o => {
            const d = new Date(o.created).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            byDay[d] = (byDay[d] || 0) + Number(o.totals.total || 0);
        });
        const entries = Object.entries(byDay).slice(-7);
        const maxVal = Math.max(1, ...entries.map(e => e[1]));

        return page(`
            <div style="margin:16px 0">
                <span class="role-pill">Quản trị viên (Admin)</span>
                <h1 class="page-t" style="margin:6px 0 0">Thống kê tổng quan hệ thống</h1>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card"><span>Tổng doanh thu (SUM total_amount)</span><b>${money(revenue)}</b></div>
                <div class="kpi-card"><span>Tổng đơn hàng</span><b>${allOrders.length}</b></div>
                <div class="kpi-card"><span>Tổng sản phẩm</span><b>${getProducts().length}</b></div>
                <div class="kpi-card"><span>Tổng tài khoản (Users)</span><b>${Object.keys(db).length}</b></div>
            </div>

            <div class="box">
                <h2>Biểu đồ doanh thu theo ngày</h2>
                ${entries.length ? `
                    <div class="chart-bars">
                        ${entries.map(([day, val]) => `
                            <div class="chart-col">
                                <span>${money(val)}</span>
                                <div class="bar-v" style="height:${Math.max(8, Math.round(val / maxVal * 130))}px"></div>
                                <small>${day}</small>
                            </div>`).join('')}
                    </div>` : '<p class="hint">Chưa có dữ liệu đơn hàng hoàn tất để vẽ biểu đồ.</p>'}
            </div>`);
    }

    let editProdId = null;
    function vAdminProducts() {
        const prods = getProducts();
        const cats = getCategories();
        const editing = editProdId ? prods.find(p => p.id == editProdId) : null;

        return page(`
            <div style="margin:16px 0">
                <span class="role-pill">Quản trị viên</span>
                <h1 class="page-t" style="margin:6px 0 0">Quản lý Sản phẩm (CRUD)</h1>
            </div>

            <div class="co">
                <div class="tbl-wrap">
                    <table class="tbl">
                        <tr><th>ID</th><th>Tên sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Kho</th><th>Thao tác</th></tr>
                        ${prods.map(p => `
                            <tr>
                                <td>#${p.id}</td>
                                <td><b>${esc(p.name)}</b></td>
                                <td>${(p.tags || []).map(t => catMap()[t] || t).join(', ')}</td>
                                <td>${money(p.price)}</td>
                                <td>${Number(p.stock ?? 0)}</td>
                                <td style="white-space:nowrap">
                                    <button class="btn btn-sm o" data-edit-prod="${p.id}">Sửa</button>
                                    <button class="btn btn-sm btn-danger" data-del-prod="${p.id}">Xóa</button>
                                </td>
                            </tr>`).join('')}
                    </table>
                </div>

                <form class="box summary" data-form="admin-prod" novalidate>
                    <h2>${editing ? 'Sửa sản phẩm #' + editing.id : 'Thêm sản phẩm mới'}</h2>
                    <input type="hidden" name="pid" value="${editing ? editing.id : ''}">
                    ${fld('pname', 'Tên sản phẩm', { req: 1, val: editing?.name })}
                    <div class="fld">
                        <label for="pcat">Danh mục (category_id) *</label>
                        <select id="pcat" name="pcat">
                            ${cats.map(c => `<option value="${esc(c.id)}" ${(editing?.tags || [])[0] === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="g2">
                        ${fld('pprice', 'Giá bán (VNĐ)', { req: 1, type: 'number', val: editing?.price || 350000 })}
                        ${fld('pstock', 'Tồn kho (stock)', { req: 1, type: 'number', val: editing?.stock ?? 15 })}
                    </div>
                    ${fld('pimg', 'Đường dẫn hình ảnh (image_url - để trống dùng hoa SVG)', { val: editing?.image_url || '' })}
                    ${fld('pdesc', 'Mô tả sản phẩm (description)', { tag: 'textarea', val: editing?.desc || DESC[editing?.id] || '' })}
                    <div class="buy" style="margin-top:8px">
                        <button class="btn" type="submit">${editing ? 'Cập nhật' : 'Thêm mới'}</button>
                        ${editing ? '<button class="btn o" type="button" data-cancel-edit-prod>Hủy sửa</button>' : ''}
                    </div>
                </form>
            </div>`);
    }

    let editCatId = null;
    function vAdminCategories() {
        const cats = getCategories();
        const editing = editCatId ? cats.find(c => c.id === editCatId) : null;

        return page(`
            <div style="margin:16px 0">
                <span class="role-pill">Quản trị viên</span>
                <h1 class="page-t" style="margin:6px 0 0">Quản lý Danh mục hoa</h1>
            </div>

            <div class="co">
                <div class="tbl-wrap">
                    <table class="tbl">
                        <tr><th>Mã danh mục</th><th>Tên danh mục</th><th>Mô tả</th><th>Thao tác</th></tr>
                        ${cats.map(c => `
                            <tr>
                                <td><code>${esc(c.id)}</code></td>
                                <td><b>${esc(c.name)}</b></td>
                                <td>${esc(c.desc || '')}</td>
                                <td style="white-space:nowrap">
                                    <button class="btn btn-sm o" data-edit-cat="${esc(c.id)}">Sửa</button>
                                    <button class="btn btn-sm btn-danger" data-del-cat="${esc(c.id)}">Xóa</button>
                                </td>
                            </tr>`).join('')}
                    </table>
                </div>

                <form class="box summary" data-form="admin-cat" novalidate>
                    <h2>${editing ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h2>
                    <input type="hidden" name="oldId" value="${editing ? esc(editing.id) : ''}">
                    ${fld('cname', 'Tên danh mục', { req: 1, val: editing?.name })}
                    ${fld('cdesc', 'Mô tả danh mục', { tag: 'textarea', val: editing?.desc || '' })}
                    <div class="buy" style="margin-top:8px">
                        <button class="btn" type="submit">${editing ? 'Lưu thay đổi' : 'Thêm danh mục'}</button>
                        ${editing ? '<button class="btn o" type="button" data-cancel-edit-cat>Hủy</button>' : ''}
                    </div>
                </form>
            </div>`);
    }

    function vAdminUsers() {
        const db = users();
        return page(`
            <div style="margin:16px 0">
                <span class="role-pill">Quản trị viên</span>
                <h1 class="page-t" style="margin:6px 0 0">Quản lý Người dùng &amp; Phân quyền</h1>
            </div>
            <div class="tbl-wrap">
                <table class="tbl">
                    <tr><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Vai trò (Role)</th><th>Thao tác</th></tr>
                    ${Object.entries(db).map(([email, u]) => `
                        <tr>
                            <td><b>${esc(u.name)}</b></td>
                            <td>${esc(email)}</td>
                            <td>${esc(u.phone || '—')}</td>
                            <td>
                                <select data-user-role="${esc(email)}">
                                    <option value="customer" ${(u.role || 'customer') === 'customer' ? 'selected' : ''}>Customer (Khách hàng)</option>
                                    <option value="clerk" ${u.role === 'clerk' ? 'selected' : ''}>Clerk (Nhân viên)</option>
                                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin (Quản trị viên)</option>
                                </select>
                            </td>
                            <td style="white-space:nowrap">
                                <button class="btn btn-sm" data-save-role="${esc(email)}">Lưu quyền</button>
                                ${email !== S.user.email ? `<button class="btn btn-sm btn-danger" data-del-user="${esc(email)}">Xóa</button>` : ''}
                            </td>
                        </tr>`).join('')}
                </table>
            </div>`);
    }

    function vAdminOrders() {
        const list = orders();
        return page(`
            <div style="margin:16px 0">
                <span class="role-pill">Quản trị viên</span>
                <h1 class="page-t" style="margin:6px 0 0">Quản lý Toàn bộ Đơn hàng</h1>
            </div>
            <div class="tbl-wrap">
                <table class="tbl">
                    <tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Can thiệp</th></tr>
                    ${list.length ? list.map(o => {
                        const curSt = o.cancelled ? 'Cancelled' : (o.status || 'Pending');
                        return `
                        <tr>
                            <td><b>${esc(o.id)}</b><br><small class="hint">${dt(o.created)}</small></td>
                            <td><b>${esc(o.name)}</b><br><small>${esc(o.phone)} · ${esc(o.address)}</small></td>
                            <td>${o.items.map(i => `<div>• ${esc(i.name)} × ${i.q}</div>`).join('')}</td>
                            <td><b style="color:var(--price)">${money(o.totals.total)}</b></td>
                            <td>
                                <select data-order-status="${esc(o.id)}">
                                    <option value="Pending" ${curSt === 'Pending' ? 'selected' : ''}>Chờ xử lý</option>
                                    <option value="Processing" ${curSt === 'Processing' ? 'selected' : ''}>Đang cắm hoa</option>
                                    <option value="Shipping" ${curSt === 'Shipping' ? 'selected' : ''}>Đang giao</option>
                                    <option value="Completed" ${curSt === 'Completed' ? 'selected' : ''}>Hoàn tất</option>
                                    <option value="Cancelled" ${curSt === 'Cancelled' ? 'selected' : ''}>Đã hủy</option>
                                </select>
                            </td>
                            <td><button class="btn btn-sm btn-danger" data-del-order="${esc(o.id)}">Xóa đơn</button></td>
                        </tr>`;
                    }).join('') : '<tr><td colspan="6" style="text-align:center;padding:24px">Chưa có đơn hàng nào.</td></tr>'}
                </table>
            </div>`);
    }

    /* ---------- router ---------- */
    function route() {
        clearInterval(heroT);
        closeAll();
        

        syncRoleChrome();
        

        const raw = location.hash.slice(1) || '/',
            [path, qs] = raw.split('?'),
            q = Object.fromEntries(new URLSearchParams(qs || '')),
            seg = path.split('/').filter(Boolean);

        const isClerk = path.startsWith('/clerk');
        const isAdmin = path.startsWith('/admin');

        if (!S.user && (isClerk || isAdmin)) {
            toast('Vui lòng đăng nhập để tiếp tục');
            location.hash = '#/tai-khoan';
            return;
        }

        if (S.user) {
            const role = S.user.role || 'customer';
            if (role === 'clerk' && !isClerk) {
                location.hash = '#/clerk/dashboard';
                return;
            }
            if (role === 'admin' && !isAdmin) {
                location.hash = '#/admin/dashboard';
                return;
            }
            if (role === 'customer' && (isClerk || isAdmin)) {
                location.hash = '#/';
                return;
            }
        }

        let html, title = 'Bloomie - Hoa tươi, gửi yêu thương', nav = '';

        switch (seg[0]) {
            case undefined:
                html = vHome();
                nav = 'home';
                break;
            case 'san-pham':
                html = vList(q);
                title = 'Sản phẩm | Bloomie';
                nav = 'san-pham';
                if ($('#q')) $('#q').value = q.q || '';
                break;
            case 'hoa': {
                const p = byId(seg[1]);
                html = vDetail(seg[1]);
                if (p) title = p.name + ' | Bloomie';
                nav = 'san-pham';
                break;
            }
            case 'thanh-toan':
                html = vCheckout();
                title = 'Thanh toán | Bloomie';
                break;
            case 'don-hang':
                html = vOrder(seg[1]);
                title = 'Đơn hàng | Bloomie';
                break;
            case 'tai-khoan':
                html = vAccount();
                title = 'Tài khoản | Bloomie';
                break;
            case 'yeu-thich':
                html = vFav();
                title = 'Yêu thích | Bloomie';
                break;
            case 'lien-he':
                html = vContact();
                title = 'Liên hệ | Bloomie';
                nav = 'lien-he';
                break;
            case 'dich-vu':
                html = vService();
                title = 'Dịch vụ | Bloomie';
                break;
            case 'clerk':
                if (seg[1] === 'orders') { html = vClerkOrders(q); nav = 'clerk-orders'; }
                else if (seg[1] === 'products') { html = vClerkProducts(); nav = 'clerk-products'; }
                else { html = vClerkDashboard(); nav = 'clerk-dashboard'; }
                title = 'Nhân viên | Bloomie';
                break;
            case 'admin':
                if (seg[1] === 'products') { html = vAdminProducts(); nav = 'admin-products'; }
                else if (seg[1] === 'categories') { html = vAdminCategories(); nav = 'admin-categories'; }
                else if (seg[1] === 'users') { html = vAdminUsers(); nav = 'admin-users'; }
                else if (seg[1] === 'orders') { html = vAdminOrders(); nav = 'admin-orders'; }
                else { html = vAdminDashboard(); nav = 'admin-dashboard'; }
                title = 'Quản trị | Bloomie';
                break;
            default:
                html = vNotFound();
        }

        if (seg[0] !== 'san-pham' && $('#q')) $('#q').value = '';

        $('#view').innerHTML = html;
        document.title = title;

        $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === nav));
        window.scrollTo({ top: 0 });
        if (!seg[0]) initHero();
        counts();
    }

    window.addEventListener('hashchange', route);

    /* ---------- sự kiện ---------- */
    $('#searchForm').onsubmit = e => {
        e.preventDefault();
        const v = $('#q').value.trim();
        location.hash = '#/san-pham' + (v ? '?q=' + encodeURIComponent(v) : '');
    };

    $('#ov').onclick = closeAll;
    $('#btnCart').onclick = openDrawer;

    document.addEventListener('change', e => {
        if (e.target.id === 'sortSel') {
            const [pa, qs] = location.hash.slice(1).split('?'), u = new URLSearchParams(qs || '');
            e.target.value ? u.set('sort', e.target.value) : u.delete('sort');
            const r = u.toString();
            location.hash = pa + (r ? '?' + r : '');
        }
        if (e.target.id === 'express') {
            $('#sumBox').innerHTML = sumHTML(e.target.checked);
        }
        // Clerk & Admin đổi trạng thái đơn hàng
        if (e.target.matches('[data-order-status]')) {
            const id = e.target.dataset.orderStatus;
            const list = orders().map(o => o.id === id
                ? { ...o, status: e.target.value, cancelled: e.target.value === 'Cancelled' }
                : o);
            LS.set('bl_orders', list);
            toast('Đã cập nhật trạng thái đơn ' + id);
            route();
        }
    });

    function refreshSummary() {
        const x = $('#express');
        if (!cartLines().length) { route(); return; }
        $('#sumBox').innerHTML = sumHTML(x && x.checked);
    }

    document.addEventListener('click', e => {
        const t = e.target, c = s => t.closest(s);
        let el;

        // Clerk cập nhật tồn kho
        if (el = c('[data-save-stock]')) {
            const id = el.dataset.saveStock;
            const inp = $(`[data-stock="${id}"]`);
            const val = Number(inp?.value);
            if (!inp || inp.value === '' || val < 0) {
                toast('Số lượng tồn kho không hợp lệ');
                return;
            }
            const list = getProducts().map(p => p.id == id ? { ...p, stock: val } : p);
            setProducts(list);
            toast('Đã cập nhật tồn kho');
            route();
            return;
        }

        // Admin phân quyền User
        if (el = c('[data-save-role]')) {
            const email = el.dataset.saveRole;
            const sel = $(`[data-user-role="${email}"]`);
            const db = users();
            if (db[email] && sel) {
                db[email].role = sel.value;
                LS.set('bl_users', db);
                if (S.user && S.user.email === email) {
                    S.user.role = sel.value;
                    save();
                }
                toast('Đã cập nhật vai trò người dùng');
                route();
            }
            return;
        }

        // Admin xóa User
        if (el = c('[data-del-user]')) {
            const email = el.dataset.delUser;
            const db = users();
            delete db[email];
            LS.set('bl_users', db);
            toast('Đã xóa tài khoản ' + email);
            route();
            return;
        }

        // Admin sửa / xóa sản phẩm
        if (el = c('[data-edit-prod]')) {
            editProdId = el.dataset.editProd;
            route();
            return;
        }
        if (c('[data-cancel-edit-prod]')) {
            editProdId = null;
            route();
            return;
        }
        if (el = c('[data-del-prod]')) {
            const id = el.dataset.delProd;
            setProducts(getProducts().filter(p => p.id != id));
            if (editProdId == id) editProdId = null;
            toast('Đã xóa sản phẩm');
            route();
            return;
        }

        // Admin sửa / xóa danh mục
        if (el = c('[data-edit-cat]')) {
            editCatId = el.dataset.editCat;
            route();
            return;
        }
        if (c('[data-cancel-edit-cat]')) {
            editCatId = null;
            route();
            return;
        }
        if (el = c('[data-del-cat]')) {
            const id = el.dataset.delCat;
            setCategories(getCategories().filter(cat => cat.id !== id));
            if (editCatId === id) editCatId = null;
            toast('Đã xóa danh mục');
            route();
            return;
        }

        // Admin xóa đơn hàng lỗi
        if (el = c('[data-del-order]')) {
            const id = el.dataset.delOrder;
            LS.set('bl_orders', orders().filter(o => o.id !== id));
            toast('Đã xóa đơn hàng ' + id);
            route();
            return;
        }

        // Menu dropdown bên Customer
        if (el = c('.has-menu>.n')) {
            const li = el.parentElement, was = li.classList.contains('open');
            $$('.has-menu.open').forEach(m => m.classList.remove('open'));
            if (!was) { li.classList.add('open'); el.setAttribute('aria-expanded', 'true'); }
            return;
        }
        $$('.has-menu.open').forEach(m => m.classList.remove('open'));

        if (c('[data-close]')) { closeAll(); return; }
        if (c('[data-checkout]')) { closeAll(); location.hash = '#/thanh-toan'; return; }
        if (el = c('[data-add]')) { addToCart(+el.dataset.add, 'M', 1); return; }

        if (el = c('[data-fav]')) {
            const id = +el.dataset.fav, i = S.favs.indexOf(id);
            if (i < 0) { S.favs.push(id); toast('Đã thêm vào yêu thích'); }
            else S.favs.splice(i, 1);
            save(); counts(); bump($('#favN'));
            if (location.hash.startsWith('#/yeu-thich')) route();
            else $$(`[data-fav="${id}"]`).forEach(b => { b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', i < 0); });
            return;
        }

        if (el = c('[data-size]')) { D.size = el.dataset.size; updateDetail(); return; }
        if (el = c('[data-dq]')) {
            const p = byId(D.id);
            const maxS = p ? Number(p.stock ?? 20) : 20;
            D.qty = Math.max(1, Math.min(maxS, D.qty + +el.dataset.dq));
            updateDetail();
            return;
        }
        if (c('[data-addd]')) { addToCart(D.id, D.size, D.qty); return; }
        if (c('[data-buy]')) { addToCart(D.id, D.size, D.qty); location.hash = '#/thanh-toan'; return; }
        if (el = c('[data-inc]')) { changeQty(el.dataset.inc, 1); return; }
        if (el = c('[data-dec]')) { changeQty(el.dataset.dec, -1); return; }
        if (el = c('[data-rm]')) { delete S.cart[el.dataset.rm]; save(); renderDrawer(); return; }
        if (el = c('[data-cinc]')) { changeQty(el.dataset.cinc, 1); refreshSummary(); return; }
        if (el = c('[data-cdec]')) { changeQty(el.dataset.cdec, -1); refreshSummary(); return; }
        if (el = c('[data-crm]')) { delete S.cart[el.dataset.crm]; save(); renderDrawer(); refreshSummary(); return; }

        if (c('[data-capply]')) {
            const v = $('#cin').value.trim().toUpperCase();
            if (COUPONS[v]) { S.coupon = v; save(); refreshSummary(); toast('Đã áp dụng mã ' + v); }
            else toast('Mã giảm giá không hợp lệ');
            return;
        }
        if (c('[data-coff]')) { S.coupon = ''; save(); refreshSummary(); return; }
        if (el = c('[data-coupon]')) { S.coupon = el.dataset.coupon; save(); renderDrawer(); toast('Đã nhận mã ' + S.coupon); return; }

        if (el = c('[data-cancel]')) {
            const l = orders().map(o => o.id === el.dataset.cancel ? { ...o, cancelled: true, status: 'Cancelled' } : o);
            LS.set('bl_orders', l);
            toast('Đã hủy đơn hàng');
            route();
            return;
        }

        if (c('[data-logout]')) {
            S.user = null;
            save();
            counts();
            toast('Đã đăng xuất');
            location.hash = '#/tai-khoan';
            route();
            return;
        }
    });

    document.addEventListener('submit', e => {
        const form = e.target.closest('form[data-form]');
        if (!form) return;
        e.preventDefault();

        switch (form.dataset.form) {
            case 'checkout': placeOrder(form); break;
            case 'login': doAuth(form, 'login'); break;
            case 'register': doAuth(form, 'register'); break;
            case 'profile': {
                if (!validate(form, { pname: rLen(2, 'Vui lòng nhập họ tên') })) return;
                const f = form.elements, db = users();
                S.user = { ...S.user, name: f.pname.value.trim(), phone: f.pphone.value.trim(), address: f.paddr.value.trim() };
                if (db[S.user.email]) {
                    db[S.user.email] = { ...db[S.user.email], name: S.user.name, phone: S.user.phone, address: S.user.address };
                    LS.set('bl_users', db);
                }
                save(); counts(); toast('Đã lưu thông tin');
                break;
            }
            case 'contact': {
                if (!validate(form, { cname: rLen(2, 'Vui lòng nhập họ tên'), cmail: rMail, cmsg: rLen(5, 'Vui lòng nhập nội dung') })) return;
                form.reset();
                toast('Đã gửi lời nhắn. Bloomie sẽ phản hồi sớm.');
                break;
            }
            case 'admin-prod': {
                if (!validate(form, { pname: rLen(2, 'Nhập tên sản phẩm') })) return;
                const f = form.elements;
                const pid = f.pid.value;
                const prods = getProducts();
                const price = Math.max(10000, Number(f.pprice.value) || 0);
                const stock = Math.max(0, Number(f.pstock.value) || 0);

                if (pid) {
                    const updated = prods.map(p => p.id == pid ? {
                        ...p,
                        name: f.pname.value.trim(),
                        tags: [f.pcat.value],
                        price,
                        old: Math.max(p.old || 0, Math.round(price * 1.2)),
                        stock,
                        image_url: f.pimg.value.trim(),
                        desc: f.pdesc.value.trim()
                    } : p);
                    setProducts(updated);
                    editProdId = null;
                    toast('Đã cập nhật sản phẩm');
                } else {
                    const nextId = prods.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
                    prods.unshift({
                        id: nextId,
                        name: f.pname.value.trim(),
                        price,
                        old: Math.round(price * 1.2),
                        rate: 5.0,
                        tags: [f.pcat.value],
                        stock,
                        image_url: f.pimg.value.trim(),
                        desc: f.pdesc.value.trim()
                    });
                    setProducts(prods);
                    toast('Đã thêm sản phẩm mới');
                }
                route();
                break;
            }
            case 'admin-cat': {
                if (!validate(form, { cname: rLen(2, 'Nhập tên danh mục') })) return;
                const f = form.elements;
                const oldId = f.oldId.value;
                const cats = getCategories();
                const name = f.cname.value.trim();
                const desc = f.cdesc.value.trim();

                if (oldId) {
                    setCategories(cats.map(c => c.id === oldId ? { ...c, name, desc } : c));
                    editCatId = null;
                    toast('Đã cập nhật danh mục');
                } else {
                    const slug = norm(name).replace(/[^a-z0-9]/g, '') || ('cat' + Date.now());
                    if (cats.some(c => c.id === slug)) {
                        toast('Danh mục này đã tồn tại');
                        return;
                    }
                    cats.push({ id: slug, name, desc });
                    setCategories(cats);
                    toast('Đã thêm danh mục mới');
                }
                route();
                break;
            }
        }
    });

    /* ---------- khởi động ---------- */
    renderDrawer();
    route();
})();
