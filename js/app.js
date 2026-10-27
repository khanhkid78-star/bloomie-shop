/* Bloomie: toàn bộ logic giao diện (router, giỏ hàng, thanh toán, tài khoản, đơn hàng).
   Dữ liệu lưu trong localStorage của trình duyệt, chưa có máy chủ. */

(function () {
    'use strict';

    /* ---------- tiện ích ---------- */

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    const money = n =>
        String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';

    const norm = s =>
        s.normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/đ/g, 'd')
            .toLowerCase();

    const esc = s =>
        String(s).replace(/[&<>"']/g, c => ({
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

    const byId = id => P.find(p => p.id == id);

    const pct = p => Math.round((1 - p.price / p.old) * 100);

    const stars = r =>
        `<span class="stars" style="--p:${r / 5 * 100}%" aria-hidden="true">★★★★★</span>`;

    async function sha(s) {
        try {
            const b = await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(s)
            );

            return [...new Uint8Array(b)]
                .map(x => x.toString(16).padStart(2, '0'))
                .join('');
        } catch (e) {
            let h = 0;

            for (const c of s) {
                h = (h * 31 + c.charCodeAt(0)) | 0;
            }

            return 'x' + h;
        }
    }

/* ---------- trạng thái ---------- */

const S = {
    cart: LS.get('bl_cart', {}),
    favs: LS.get('bl_favs', []),
    coupon: LS.get('bl_coupon', ''),
    user: LS.get('bl_session', null)
};

const save = () => {
    LS.set('bl_cart', S.cart);
    LS.set('bl_favs', S.favs);
    LS.set('bl_coupon', S.coupon);
    LS.set('bl_session', S.user);
};

const users = () => LS.get('bl_users', {});
const orders = () => LS.get('bl_orders', []);


/* ---------- giá và giỏ hàng ---------- */

const unit = (p, s) =>
    Math.round(p.price * SIZES[s].m / 10000) * 10000;

const unitOld = (p, s) =>
    Math.round(p.old * SIZES[s].m / 10000) * 10000;

const cartLines = () =>
    Object.entries(S.cart)
        .filter(([k]) => byId(k.split('|')[0]))
        .map(([k, q]) => {
            const [id, s] = k.split('|'),
                p = byId(id);

            return {
                k,
                p,
                s,
                q,
                u: unit(p, s)
            };
        });

function totals(express) {
    const L = cartLines(),
        sub = L.reduce((a, l) => a + l.u * l.q, 0),
        count = L.reduce((a, l) => a + l.q, 0);

    const disc = S.coupon === 'BLOOM10'
        ? Math.round(sub * .1)
        : 0;

    const after = sub - disc;

    const free = after >= 500000 || S.coupon === 'FREESHIP';

    let ship = !sub ? 0 : free ? 0 : 30000;

    const fast = express && sub ? 20000 : 0;

    return {
        sub,
        disc,
        after,
        ship,
        fast,
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

    toastT = setTimeout(() => {
        t.classList.remove('on');
    }, 2600);
}

function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
}

function counts() {
    $('#cartN').textContent = totals().count;
    $('#favN').textContent = S.favs.length;

    $('#accTxt').innerHTML = S.user
        ? 'Xin chào<br>' + esc(S.user.name.split(' ').pop())
        : 'Đăng nhập<br>Đăng ký';
}

function addToCart(id, size, qty) {
    const k = id + '|' + size;

    S.cart[k] = Math.min(20, (S.cart[k] || 0) + qty);

    save();
    renderDrawer();
    bump($('#cartN'));

    toast('Đã thêm “' + byId(id).name + '” vào giỏ hàng');
}

function changeQty(k, d) {
    S.cart[k] = (S.cart[k] || 0) + d;

    if (S.cart[k] <= 0) {
        delete S.cart[k];
    }

    if (S.cart[k] > 20) {
        S.cart[k] = 20;
    }

    save();
    renderDrawer();
}

/* ---------- giỏ hàng nhanh (ngăn kéo) ---------- */

function renderDrawer() {
    const L = cartLines(),
        T = totals();

    counts();

    if (!L.length) {
        $('#lines').innerHTML = `
            <div class="empty">
                Giỏ hàng đang trống.
                <br>
                <a class="cta" href="#/san-pham" data-close>
                    Chọn hoa ngay
                </a>
            </div>
        `;

        $('#df').innerHTML = S.coupon
            ? `
                <div class="coupon">
                    <span>Mã <b>${S.coupon}</b> đã sẵn sàng</span>
                </div>
            `
            : '';

        return;
    }

    $('#lines').innerHTML = L.map(l => `
        <div class="ln">
            <div class="th">
                ${bouquet(l.p.sp, l.p.id)}
            </div>

            <div>
                <h4>${l.p.name}</h4>
                <small class="hint">Cỡ ${SIZES[l.s].n}</small>
                <br>
                <b>${money(l.u)}</b>

                <div class="row">
                    <div class="qty">
                        <button
                            data-dec="${l.k}"
                            aria-label="Giảm số lượng"
                        >
                            ${ic('minus')}
                        </button>

                        <span>${l.q}</span>

                        <button
                            data-inc="${l.k}"
                            aria-label="Tăng số lượng"
                        >
                            ${ic('plus')}
                        </button>
                    </div>

                    <button class="rm" data-rm="${l.k}">
                        Xóa
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    $('#df').innerHTML = `
        <div class="ship">
            ${
                T.left && S.coupon !== 'FREESHIP'
                    ? `Mua thêm ${money(T.left)} để được miễn phí giao hàng`
                    : 'Bạn được miễn phí giao hàng'
            }

            <div class="bar">
                <i style="width:${Math.min(100, T.after / 5000)}%"></i>
            </div>
        </div>

        <div class="sum">
            <span>Tạm tính</span>
            <span>${money(T.sub)}</span>
        </div>

        ${
            T.disc
                ? `
                    <div class="sum">
                        <span>Giảm 10%</span>
                        <span>-${money(T.disc)}</span>
                    </div>
                `
                : ''
        }

        <button class="pay" data-checkout>
            Thanh toán
        </button>
    `;
}

let lastFocus;

function openDrawer() {
    lastFocus = document.activeElement;

    $('#ov').classList.add('on');
    $('#drawer').classList.add('on');
    $('#drawer').setAttribute('aria-hidden', 'false');

    setTimeout(() => {
        const b = $('#drawer [data-close]');
        b && b.focus();
    }, 50);
}

function closeAll() {
    $('#drawer').classList.remove('on');
    $('#drawer').setAttribute('aria-hidden', 'true');
    $('#ov').classList.remove('on');
}


/* ---------- thành phần dùng chung ---------- */

const favBtn = id => `
    <button
        class="fav${S.favs.includes(id) ? ' on' : ''}"
        data-fav="${id}"
        aria-pressed="${S.favs.includes(id)}"
        aria-label="Yêu thích"
    >
        ${ic('heart')}
    </button>
`;

const card = p => `
    <article class="card">
        <div class="pic">
            <a href="#/hoa/${p.id}" aria-label="${esc(p.name)}">
                ${bouquet(p.sp, p.id)}
            </a>

            ${favBtn(p.id)}
        </div>

        <div class="info">
            <h3>
                <a href="#/hoa/${p.id}">${p.name}</a>
            </h3>

            <div class="pr">
                <b>${money(p.price)}</b>
                <s>${money(p.old)}</s>
                <span class="off">-${pct(p)}%</span>
            </div>

            <div class="rt">
                ${stars(p.rate)}(${p.rate.toFixed(1)})
            </div>

            <button class="btn-add" data-add="${p.id}">
                ${ic('cart')}Thêm vào giỏ
            </button>
        </div>
    </article>
`;

const crumb = a => `
    <nav class="crumb" aria-label="Điều hướng">
        ${
            a.map((x, i) =>
                i < a.length - 1
                    ? `
                        <a href="${x[1]}">${x[0]}</a>
                        ${ic('right')}
                    `
                    : `
                        <span aria-current="page">${x[0]}</span>
                    `
            ).join('')
        }
    </nav>
`;

const page = h => `
    <div class="wrap sec">
        ${h}
    </div>
`;

const empty = (msg, btn) => `
    <div class="empty big2">
        ${msg}
        <br>
        ${
            btn ||
            '<a class="cta" href="#/san-pham">Xem tất cả hoa</a>'
        }
    </div>
`;

const fld = (id, label, o = {}) => `
    <div class="fld ${o.full ? 'full' : ''}" data-f="${id}">
        <label for="${id}">
            ${label}${o.req ? ' *' : ''}
        </label>

        ${
            o.tag === 'textarea'
                ? `
                    <textarea
                        id="${id}"
                        name="${id}"
                        ${o.attr || ''}
                    >${esc(o.val || '')}</textarea>
                `
                : `
                    <input
                        id="${id}"
                        name="${id}"
                        type="${o.type || 'text'}"
                        value="${esc(o.val || '')}"
                        ${o.attr || ''}
                    >
                `
        }

        <span class="err" aria-live="polite"></span>
    </div>
`;

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

        if (m && !first) {
            first = id;
        }
    }

    if (first) {
        form.elements[first].focus();
    }

    return !first;
}

const rPhone = v =>
    /^(0|\+84)\d{9}$/.test(v.replace(/[\s.-]/g, ''))
        ? ''
        : 'Số điện thoại gồm 10 số, bắt đầu bằng 0';

const rMail = v =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? ''
        : 'Email chưa đúng định dạng';

const rLen = (n, m) => v =>
    v.length >= n ? '' : m;


/* ---------- trang chủ ---------- */

function stripArt() {
    const R = rng(5);

    let s = `
        <svg viewBox="0 0 210 92" preserveAspectRatio="xMaxYMid meet">
            ${leaf(70, 92, 60, -30, G.d)}
            ${leaf(110, 92, 64, 10, G.b)}
            ${leaf(160, 92, 60, 40, G.d)}
    `;

    [
        [40, 60, 17],
        [78, 40, 19],
        [120, 56, 20],
        [160, 36, 17],
        [190, 62, 15],
        [100, 22, 13]
    ].forEach(([x, y, r], i) => {
        s += i % 2
            ? daisy(x, y, r, i * 20)
            : lily(x, y, r + 4, i * 30);
    });

    return s
        + baby(60, 22, 12, R)
        + baby(145, 70, 12, R)
        + '</svg>';
}

function vHome() {
    const slides = SLIDES.map((s, i) => `
        <article
            class="slide${i ? '' : ' on'}"
            aria-hidden="${i ? 'true' : 'false'}"
            aria-roledescription="slide"
            aria-label="${i + 1} trên ${SLIDES.length}"
        >
            <div class="copy">
                <p class="kicker">${s.k}</p>

                <h2>
                    ${s.a}
                    <em>${s.b}${ic('heart')}</em>
                </h2>

                <p class="d">${s.d}</p>

                <a
                    class="cta"
                    href="#/san-pham?tag=${s.tag}"
                    ${i ? 'tabindex="-1"' : ''}
                >
                    Mua ngay${ic('arrow')}
                </a>
            </div>

            <div class="art">
                ${bouquet(s.sp, i + 3, { hero: true, tag: i === 0 })}
            </div>
        </article>
    `).join('');

    const cats = Object.keys(TAGS).map(k => `
        <a
            class="cat"
            role="listitem"
            href="#/san-pham?tag=${k}"
        >
            <span class="c" style="background:${CATBG[k]}">
                ${ico(k)}
            </span>

            <span>${TAGS[k]}</span>
        </a>
    `).join('');

    const svc = [
        ['truck', 'Giao hoa nhanh', 'Trong 2 - 4 giờ tại Đà Nẵng'],
        ['shield', 'Hoa tươi mỗi ngày', 'Cam kết hoa luôn tươi mới'],
        ['gift', 'Thanh toán an toàn', 'Đa dạng hình thức thanh toán'],
        ['phone', 'Hỗ trợ 24/7', 'Luôn sẵn sàng hỗ trợ bạn']
    ].map(r => `
        <a href="#/dich-vu">
            <span class="ic">${ic(r[0])}</span>

            <span>
                <b>${r[1]}</b>
                <small>${r[2]}</small>
            </span>

            <span class="go">${ic('right')}</span>
        </a>
    `).join('');

    return `
        <div class="wrap">
            <section
                class="hero"
                aria-roledescription="carousel"
                aria-label="Hoa nổi bật"
            >
                <svg
                    class="leafart"
                    viewBox="0 0 130 150"
                    aria-hidden="true"
                >
                    <path d="M20 140C20 90 50 45 100 20"/>
                    <path d="M42 98C28 90 24 74 30 62c14 4 22 18 12 36z"/>
                    <path d="M60 72C48 62 48 46 58 36c12 8 14 24 2 36z"/>
                    <path d="M82 48C74 36 78 22 90 16c8 10 6 24-8 32z"/>
                    <path d="M36 118C50 112 62 96 62 84"/>
                    <path d="M52 40l22 14"/>
                </svg>

                <div class="slides">
                    ${slides}
                </div>

                <button
                    class="arrow prev"
                    id="prev"
                    aria-label="Slide trước"
                >
                    ${ic('left')}
                </button>

                <button
                    class="arrow next"
                    id="next"
                    aria-label="Slide sau"
                >
                    ${ic('right')}
                </button>

                <div class="dots" id="dots">
                    ${
                        SLIDES.map((_, i) => `
                            <button
                                class="${i ? '' : 'on'}"
                                aria-label="Chuyển đến slide ${i + 1}"
                                data-i="${i}"
                            ></button>
                        `).join('')
                    }
                </div>
            </section>

            <div class="cats" role="list" aria-label="Danh mục hoa">
                ${cats}
            </div>

            <div class="layout">
                <div>
                    <section class="panel">
                        <div class="ph">
                            ${ic('flower')}
                            <h2>Sản phẩm nổi bật</h2>

                            <a class="all" href="#/san-pham">
                                Xem tất cả ${ic('arrow')}
                            </a>
                        </div>

                        <div class="grid">
                            ${P.slice(0, 4).map(card).join('')}
                        </div>
                    </section>

                    <section class="strip" aria-label="Cam kết của Bloomie">
                        <div class="l">
                            <div class="tag">
                                Hoa không chỉ là món quà, mà còn là cảm xúc…
                            </div>

                            <ul>
                                <li>
                                    ${ic('leaf')}Hoa tươi<br>
                                    chất lượng
                                </li>

                                <li>
                                    ${ic('heart')}Thiết kế<br>
                                    độc đáo
                                </li>

                                <li>
                                    ${ic('truck')}Giao hàng<br>
                                    đúng hẹn
                                </li>

                                <li>
                                    ${ic('shield')}Hỗ trợ<br>
                                    nhiệt tình
                                </li>
                            </ul>
                        </div>

                        <div class="r" aria-hidden="true">
                            ${stripArt()}
                        </div>
                    </section>
                </div>

                <aside class="aside">
                    <div class="panel svc">
                        ${svc}
                    </div>

                    <div class="promo">
                        <h3>
                            ${ic('gift')}Ưu đãi đặc biệt
                        </h3>

                        <p>
                            Giảm ngay 10% cho đơn hàng đầu tiên
                        </p>

                        <button class="cta" data-coupon="BLOOM10">
                            Nhận ngay${ic('arrow')}
                        </button>

                        <div class="art2" aria-hidden="true">
                            ${ico('tulip')}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    `;
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

        $$('#dots button').forEach((b, k) => {
            b.classList.toggle('on', k === cur);
        });
    };

    const auto = () => {
        clearInterval(heroT);

        if (!reduce) {
            heroT = setInterval(() => go(cur + 1), 6000);
        }
    };

    $('#prev').onclick = () => {
        go(cur - 1);
        auto();
    };

    $('#next').onclick = () => {
        go(cur + 1);
        auto();
    };

    $('#dots').onclick = e => {
        const b = e.target.closest('button');

        if (b) {
            go(+b.dataset.i);
            auto();
        }
    };

    const h = $('.hero');

    h.addEventListener('mouseenter', () => clearInterval(heroT));
    h.addEventListener('mouseleave', auto);
    h.addEventListener('focusin', () => clearInterval(heroT));
    h.addEventListener('focusout', auto);

    auto();
}
/* ---------- danh sách sản phẩm ---------- */

const PRICES = {
    '': 'Mọi mức giá',
    lt300: 'Dưới 300.000đ',
    m300: '300.000đ - 500.000đ',
    gt500: 'Trên 500.000đ'
};

const priceOk = (p, r) =>
    !r ||
    (r === 'lt300' && p.price < 300000) ||
    (r === 'm300' && p.price >= 300000 && p.price <= 500000) ||
    (r === 'gt500' && p.price > 500000);

const SORTS = {
    '': 'Nổi bật',
    'gia-tang': 'Giá tăng dần',
    'gia-giam': 'Giá giảm dần',
    'giam-gia': 'Giảm giá nhiều',
    'danh-gia': 'Đánh giá cao'
};

function vList(q) {
    const tag = TAGS[q.tag] ? q.tag : '',
        price = q.price || '',
        sort = q.sort || '',
        kw = (q.q || '').trim();

    let l = P.filter(p =>
        (!tag || p.tags.includes(tag)) &&
        priceOk(p, price) &&
        (
            !kw ||
            norm(
                p.name + ' ' + p.tags.map(t => TAGS[t]).join(' ')
            ).includes(norm(kw))
        )
    );

    const cmp = {
        'gia-tang': (a, b) => a.price - b.price,
        'gia-giam': (a, b) => b.price - a.price,
        'giam-gia': (a, b) => pct(b) - pct(a),
        'danh-gia': (a, b) => b.rate - a.rate
    }[sort];

    if (cmp) {
        l.sort(cmp);
    }

    const href = o => {
        const m = {
            tag,
            price,
            sort,
            q: kw,
            ...o
        };

        const u = new URLSearchParams();

        for (const k in m) {
            if (m[k]) {
                u.set(k, m[k]);
            }
        }

        const s = u.toString();

        return '#/san-pham' + (s ? '?' + s : '');
    };

    const title = kw
        ? 'Kết quả cho “' + esc(kw) + '”'
        : tag
            ? TAGS[tag]
            : 'Tất cả sản phẩm';

    return page(`
        ${crumb(
            tag || kw
                ? [
                    ['Trang chủ', '#/'],
                    ['Sản phẩm', '#/san-pham'],
                    [title]
                ]
                : [
                    ['Trang chủ', '#/'],
                    ['Sản phẩm']
                ]
        )}

        <h1 class="page-t">${title}</h1>

        <div class="shop">
            <aside class="filters" aria-label="Bộ lọc">
                <div class="grp">
                    <h3>Danh mục</h3>

                    <a
                        href="${href({ tag: '' })}"
                        class="${tag ? '' : 'on'}"
                    >
                        Tất cả
                        <small>${P.length}</small>
                    </a>

                    ${
                        Object.keys(TAGS).map(k => `
                            <a
                                href="${href({ tag: k })}"
                                class="${tag === k ? 'on' : ''}"
                            >
                                ${TAGS[k]}

                                <small>
                                    ${P.filter(p => p.tags.includes(k)).length}
                                </small>
                            </a>
                        `).join('')
                    }
                </div>

                <div class="grp">
                    <h3>Mức giá</h3>

                    ${
                        Object.keys(PRICES).map(k => `
                            <a
                                href="${href({ price: k })}"
                                class="${price === k ? 'on' : ''}"
                            >
                                ${PRICES[k]}
                            </a>
                        `).join('')
                    }
                </div>
            </aside>

            <div>
                <div class="toolbar">
                    <span class="cnt">${l.length} sản phẩm</span>

                    <label>
                        Sắp xếp

                        <select id="sortSel">
                            ${
                                Object.keys(SORTS).map(k => `
                                    <option
                                        value="${k}"
                                        ${sort === k ? 'selected' : ''}
                                    >
                                        ${SORTS[k]}
                                    </option>
                                `).join('')
                            }
                        </select>
                    </label>
                </div>

                ${
                    l.length
                        ? `
                            <div class="grid">
                                ${l.map(card).join('')}
                            </div>
                        `
                        : empty('Không tìm thấy hoa phù hợp với bộ lọc.')
                }
            </div>
        </div>
    `);
}

/* ---------- chi tiết sản phẩm ---------- */

let D = {
    id: 0,
    size: 'M',
    qty: 1
};

function vDetail(id) {
    const p = byId(id);

    if (!p) return vNotFound();

    D = {
        id: p.id,
        size: 'M',
        qty: 1
    };

    const rel = P.filter(x =>
        x.id !== p.id &&
        x.tags.some(t => p.tags.includes(t))
    ).slice(0, 4);

    return page(`
        ${crumb([
            ['Trang chủ', '#/'],
            ['Sản phẩm', '#/san-pham'],
            [p.name]
        ])}

        <div class="detail">
            <div class="big">
                ${bouquet(p.sp, p.id)}
                ${favBtn(p.id)}
            </div>

            <div class="dinfo">
                <h1>${p.name}</h1>

                <div class="rt">
                    ${stars(p.rate)}
                    <span>${p.rate.toFixed(1)} / 5</span>
                </div>

                <div class="pr" style="margin-top:10px">
                    <b id="dpr">${money(p.price)}</b>
                    <s id="dold">${money(p.old)}</s>
                    <span class="off">-${pct(p)}%</span>
                </div>

                <p class="desc">${DESC[p.id]}</p>

                <div>
                    ${
                        p.tags.map(t => `
                            <a
                                class="chip"
                                href="#/san-pham?tag=${t}"
                                style="margin:0 6px 6px 0;padding:3px 12px"
                            >
                                ${TAGS[t]}
                            </a>
                        `).join('')
                    }
                </div>

                <h4>Chọn kích cỡ</h4>

                <div class="opt" id="sizes">
                    ${
                        Object.keys(SIZES).map(k => `
                            <button
                                type="button"
                                data-size="${k}"
                                aria-pressed="${k === 'M'}"
                            >
                                ${SIZES[k].n}
                                <small>${SIZES[k].note}</small>
                            </button>
                        `).join('')
                    }
                </div>

                <h4>Số lượng</h4>

                <div class="qty lg">
                    <button data-dq="-1" aria-label="Giảm">
                        ${ic('minus')}
                    </button>

                    <span id="dq">1</span>

                    <button data-dq="1" aria-label="Tăng">
                        ${ic('plus')}
                    </button>
                </div>

                <div class="buy">
                    <button class="btn" data-addd>
                        ${ic('cart')}Thêm vào giỏ
                    </button>

                    <button class="btn o" data-buy>
                        Mua ngay
                    </button>
                </div>

                <div class="facts">
                    <details open>
                        <summary>Giao hàng</summary>

                        <p>
                            Giao trong 2 - 4 giờ tại Đà Nẵng,
                            hoặc hẹn khung giờ bạn muốn.
                            Miễn phí giao hàng cho đơn từ 500.000đ.
                        </p>
                    </details>

                    <details>
                        <summary>Cách bảo quản</summary>

                        <ul>
                            ${CARE.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    </details>
                </div>
            </div>
        </div>

        ${
            rel.length
                ? `
                    <section class="panel">
                        <div class="ph">
                            ${ic('flower')}
                            <h2>Có thể bạn cũng thích</h2>
                        </div>

                        <div class="grid">
                            ${rel.map(card).join('')}
                        </div>
                    </section>
                `
                : ''
        }
    `);
}

function updateDetail() {
    const p = byId(D.id);

    $('#dpr').textContent = money(unit(p, D.size));
    $('#dold').textContent = money(unitOld(p, D.size));
    $('#dq').textContent = D.qty;

    $$('[data-size]').forEach(b => {
        b.setAttribute(
            'aria-pressed',
            b.dataset.size === D.size
        );
    });
}
/* ---------- thanh toán ---------- */

function sumHTML(express) {
    const L = cartLines(),
        T = totals(express);

    return L.map(l => `
        <div class="sl">
            <div class="th">
                ${bouquet(l.p.sp, l.p.id)}
            </div>

            <div>
                <h4>${l.p.name}</h4>
                <small>Cỡ ${SIZES[l.s].n}</small>

                <div class="qty">
                    <button
                        type="button"
                        data-cdec="${l.k}"
                        aria-label="Giảm"
                    >
                        ${ic('minus')}
                    </button>

                    <span>${l.q}</span>

                    <button
                        type="button"
                        data-cinc="${l.k}"
                        aria-label="Tăng"
                    >
                        ${ic('plus')}
                    </button>
                </div>
            </div>

            <div style="text-align:right">
                <b style="color:var(--price)">
                    ${money(l.u * l.q)}
                </b>

                <br>

                <button
                    type="button"
                    class="rm"
                    data-crm="${l.k}"
                >
                    Xóa
                </button>
            </div>
        </div>
    `).join('')

    + (
        S.coupon
            ? `
                <div class="coupon" style="margin-top:12px">
                    <span>
                        Mã <b>${S.coupon}</b>: ${COUPONS[S.coupon]}
                    </span>

                    <button type="button" class="rm" data-coff>
                        Bỏ mã
                    </button>
                </div>
            `
            : `
                <div class="cp">
                    <input
                        id="cin"
                        placeholder="Mã giảm giá (thử BLOOM10)"
                        aria-label="Mã giảm giá"
                    >

                    <button type="button" class="btn o" data-capply>
                        Áp dụng
                    </button>
                </div>
            `
    )

    + `
        <div class="sum">
            <span>Tạm tính</span>
            <span>${money(T.sub)}</span>
        </div>

        ${
            T.disc
                ? `
                    <div class="sum">
                        <span>Giảm 10%</span>
                        <span>-${money(T.disc)}</span>
                    </div>
                `
                : ''
        }

        <div class="sum">
            <span>Phí giao hàng</span>
            <span>${T.ship ? money(T.ship) : 'Miễn phí'}</span>
        </div>

        ${
            T.fast
                ? `
                    <div class="sum">
                        <span>Giao nhanh 2 - 4 giờ</span>
                        <span>${money(T.fast)}</span>
                    </div>
                `
                : ''
        }

        <div class="sum t">
            <span>Tổng cộng</span>
            <b>${money(T.total)}</b>
        </div>

        <p class="hint">
            ${
                T.left && S.coupon !== 'FREESHIP'
                    ? `Mua thêm ${money(T.left)} để được miễn phí giao hàng.`
                    : ''
            }
        </p>
    `;
}

function vCheckout() {
    if (!cartLines().length) {
        return page(
            crumb([
                ['Trang chủ', '#/'],
                ['Thanh toán']
            ]) + empty('Giỏ hàng của bạn đang trống.')
        );
    }

    const u = S.user || {},
        d = new Date(),
        today = d.toLocaleDateString('sv-SE');

    return page(`
        ${crumb([
            ['Trang chủ', '#/'],
            ['Thanh toán']
        ])}

        <h1 class="page-t">Thanh toán</h1>

        <div class="co">
            <form id="coForm" data-form="checkout" novalidate>
                <div class="box">
                    <h2>Thông tin người nhận</h2>

                    <div class="g2">
                        ${fld('name', 'Họ và tên', {
                            req: 1,
                            val: u.name,
                            attr: 'autocomplete="name"'
                        })}

                        ${fld('phone', 'Số điện thoại', {
                            req: 1,
                            type: 'tel',
                            val: u.phone,
                            attr: 'autocomplete="tel" inputmode="tel"'
                        })}

                        ${fld('email', 'Email (không bắt buộc)', {
                            type: 'email',
                            val: u.email,
                            attr: 'autocomplete="email"',
                            full: 1
                        })}

                        ${fld('address', 'Địa chỉ giao hoa', {
                            req: 1,
                            val: u.address,
                            attr: 'autocomplete="street-address" placeholder="Số nhà, đường, phường, quận"',
                            full: 1
                        })}
                    </div>
                </div>

                <div class="box">
                    <h2>Thời gian giao</h2>

                    <div class="g2">
                        ${fld('date', 'Ngày giao', {
                            req: 1,
                            type: 'date',
                            val: today,
                            attr: `min="${today}"`
                        })}

                        <div class="fld" data-f="slot">
                            <label for="slot">Khung giờ</label>

                            <select id="slot" name="slot">
                                ${
                                    SLOTS.map(s => `
                                        <option>${s}</option>
                                    `).join('')
                                }
                            </select>

                            <span class="err"></span>
                        </div>
                    </div>

                    <label class="chk">
                        <input
                            type="checkbox"
                            id="express"
                            name="express"
                        >

                        <span>
                            Giao nhanh trong 2 - 4 giờ

                            <small class="hint">
                                (+20.000đ, ưu tiên hơn khung giờ đã chọn)
                            </small>
                        </span>
                    </label>
                </div>

                <div class="box">
                    <h2>Lời nhắn</h2>

                    ${fld('msg', 'Nội dung thiệp kèm hoa', {
                        tag: 'textarea',
                        attr: 'maxlength="160" placeholder="Ví dụ: Chúc mẹ luôn khỏe và vui nhé!"'
                    })}

                    ${fld('note', 'Ghi chú cho người giao', {
                        tag: 'textarea',
                        attr: 'maxlength="200" placeholder="Ví dụ: Gọi trước khi đến, để ở quầy lễ tân"'
                    })}
                </div>

                <div class="box">
                    <h2>Hình thức thanh toán</h2>

                    <div class="pick">
                        <label>
                            <input
                                type="radio"
                                name="pay"
                                value="cod"
                                checked
                            >

                            <span>
                                Thanh toán khi nhận hoa

                                <small>
                                    Trả tiền mặt cho người giao hàng
                                </small>
                            </span>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="pay"
                                value="bank"
                            >

                            <span>
                                Chuyển khoản ngân hàng

                                <small>
                                    Thông tin chuyển khoản sẽ gửi sau khi đặt hàng
                                </small>
                            </span>
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="pay"
                                value="wallet"
                            >

                            <span>
                                Ví điện tử

                                <small>
                                    Bản demo, chưa kết nối cổng thanh toán
                                </small>
                            </span>
                        </label>
                    </div>
                </div>
            </form>

            <aside class="box summary">
                <h2>Đơn hàng của bạn</h2>

                <div id="sumBox">
                    ${sumHTML(false)}
                </div>

                <button
                    class="pay"
                    type="submit"
                    form="coForm"
                    style="width:100%"
                >
                    Đặt hàng
                </button>
            </aside>
        </div>
    `);
}
function placeOrder(form) {
    const ok = validate(form, {
        name: rLen(2, 'Vui lòng nhập họ tên'),

        phone: rPhone,

        address: rLen(8, 'Vui lòng nhập địa chỉ đầy đủ'),

        date: v =>
            !v
                ? 'Chọn ngày giao'
                : v < new Date().toLocaleDateString('sv-SE')
                    ? 'Ngày giao không được ở quá khứ'
                    : ''
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
        cancelled: false,

        items: L.map(l => ({
            id: l.p.id,
            name: l.p.name,
            size: l.s,
            q: l.q,
            u: l.u
        })),

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

const STEPS = [
    'Đã nhận đơn',
    'Đang cắm hoa',
    'Đang giao',
    'Hoàn tất'
];

const PAYS = {
    cod: 'Thanh toán khi nhận hoa',
    bank: 'Chuyển khoản ngân hàng',
    wallet: 'Ví điện tử'
};

const stepOf = o =>
    Math.min(3, Math.floor((Date.now() - o.created) / 120000));

const statusOf = o =>
    o.cancelled
        ? ['Đã hủy', 'no']
        : stepOf(o) === 3
            ? ['Hoàn tất', 'ok2']
            : [STEPS[stepOf(o)], ''];

const dt = ts =>
    new Date(ts).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

const fdate = s =>
    s.split('-').reverse().join('/');

function vOrder(id) {
    const o = orders().find(x => x.id === id);

    if (!o) {
        return page(
            crumb([
                ['Trang chủ', '#/'],
                ['Đơn hàng']
            ]) +
            empty(
                'Không tìm thấy đơn hàng ' + esc(id) + ' trên thiết bị này.',
                '<a class="cta" href="#/tai-khoan">Tra cứu đơn hàng</a>'
            )
        );
    }

    const [st, cls] = statusOf(o),
        T = o.totals,
        fresh = Date.now() - o.created < 30000;

    return page(`
        ${crumb([
            ['Trang chủ', '#/'],
            ['Tài khoản', '#/tai-khoan'],
            ['Đơn ' + o.id]
        ])}

        ${
            fresh && !o.cancelled
                ? `
                    <div class="done">
                        <div class="tick">
                            ${ic('shield')}
                        </div>

                        <h1
                            class="page-t"
                            style="margin-bottom:6px"
                        >
                            Đặt hàng thành công
                        </h1>

                        <p
                            class="lead"
                            style="margin:0 auto 10px"
                        >
                            Bloomie đã nhận đơn <b>${o.id}</b>
                            và sẽ liên hệ xác nhận qua số
                            ${esc(o.phone)}.
                        </p>
                    </div>
                `
                : `
                    <h1 class="page-t">
                        Đơn hàng ${o.id}
                    </h1>
                `
        }

        <div class="co">
            <div>
                <div class="box">
                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            gap:10px;
                            flex-wrap:wrap;
                            align-items:center
                        "
                    >
                        <h2 style="margin:0">Tiến độ</h2>

                        <span class="st ${cls}">
                            ${st}
                        </span>
                    </div>

                    ${
                        o.cancelled
                            ? `
                                <p class="hint">
                                    Đơn hàng này đã được hủy.
                                </p>
                            `
                            : `
                                <ol class="tl">
                                    ${
                                        STEPS.map((s, i) => `
                                            <li class="${i <= stepOf(o) ? 'on' : ''}">
                                                ${s}
                                            </li>
                                        `).join('')
                                    }
                                </ol>

                                <p class="hint">
                                    Tiến độ được mô phỏng theo thời gian
                                    trong bản demo.
                                </p>
                            `
                    }
                </div>

                <div class="box">
                    <h2>Thông tin giao hàng</h2>

                    <dl class="kv">
                        <dt>Người nhận</dt>
                        <dd>${esc(o.name)}</dd>

                        <dt>Điện thoại</dt>
                        <dd>${esc(o.phone)}</dd>

                        <dt>Địa chỉ</dt>
                        <dd>${esc(o.address)}</dd>

                        <dt>Thời gian</dt>
                        <dd>
                            ${fdate(o.date)},
                            ${o.express
                                ? 'giao nhanh 2 - 4 giờ'
                                : o.slot}
                        </dd>

                        <dt>Thanh toán</dt>
                        <dd>${PAYS[o.pay]}</dd>

                        ${
                            o.msg
                                ? `
                                    <dt>Lời nhắn</dt>
                                    <dd>${esc(o.msg)}</dd>
                                `
                                : ''
                        }

                        ${
                            o.note
                                ? `
                                    <dt>Ghi chú</dt>
                                    <dd>${esc(o.note)}</dd>
                                `
                                : ''
                        }

                        <dt>Đặt lúc</dt>
                        <dd>${dt(o.created)}</dd>
                    </dl>
                </div>
            </div>

            <aside class="box summary">
                <h2>Sản phẩm</h2>

                ${
                    o.items.map(i => {
                        const p = byId(i.id);

                        return `
                            <div class="sl">
                                <div class="th">
                                    ${p ? bouquet(p.sp, p.id) : ''}
                                </div>

                                <div>
                                    <h4>${esc(i.name)}</h4>

                                    <small>
                                        Cỡ ${SIZES[i.size].n}
                                        · SL ${i.q}
                                    </small>
                                </div>

                                <b style="color:var(--price)">
                                    ${money(i.u * i.q)}
                                </b>
                            </div>
                        `;
                    }).join('')
                }

                <div
                    class="sum"
                    style="margin-top:10px"
                >
                    <span>Tạm tính</span>
                    <span>${money(T.sub)}</span>
                </div>

                ${
                    T.disc
                        ? `
                            <div class="sum">
                                <span>Giảm giá</span>
                                <span>-${money(T.disc)}</span>
                            </div>
                        `
                        : ''
                }

                <div class="sum">
                    <span>Phí giao hàng</span>

                    <span>
                        ${
                            T.ship + T.fast
                                ? money(T.ship + T.fast)
                                : 'Miễn phí'
                        }
                    </span>
                </div>

                <div class="sum t">
                    <span>Tổng cộng</span>
                    <b>${money(T.total)}</b>
                </div>

                ${
                    !o.cancelled && stepOf(o) < 2
                        ? `
                            <button
                                class="btn o"
                                style="width:100%;margin-top:12px"
                                data-cancel="${o.id}"
                            >
                                Hủy đơn hàng
                            </button>
                        `
                        : ''
                }
            </aside>
        </div>
    `);
}

/* ---------- tài khoản ---------- */

function vAccount() {
    if (!S.user) {
        return page(`
            ${crumb([
                ['Trang chủ', '#/'],
                ['Tài khoản']
            ])}

            <h1 class="page-t">Tài khoản</h1>

            <p class="lead">
                Đăng nhập để lưu thông tin giao hàng
                và xem lại các đơn đã đặt.
            </p>

            <div class="acc">
                <form class="box" data-form="login" novalidate>
                    <h2>Đăng nhập</h2>

                    ${fld('lemail', 'Email', {
                        req: 1,
                        type: 'email',
                        attr: 'autocomplete="email"'
                    })}

                    ${fld('lpass', 'Mật khẩu', {
                        req: 1,
                        type: 'password',
                        attr: 'autocomplete="current-password"'
                    })}

                    <button
                        class="btn"
                        type="submit"
                        style="width:100%"
                    >
                        Đăng nhập
                    </button>
                </form>

                <form class="box" data-form="register" novalidate>
                    <h2>Tạo tài khoản</h2>

                    ${fld('rname', 'Họ và tên', {
                        req: 1,
                        attr: 'autocomplete="name"'
                    })}

                    ${fld('remail', 'Email', {
                        req: 1,
                        type: 'email',
                        attr: 'autocomplete="email"'
                    })}

                    ${fld('rpass', 'Mật khẩu (ít nhất 6 ký tự)', {
                        req: 1,
                        type: 'password',
                        attr: 'autocomplete="new-password"'
                    })}

                    <button
                        class="btn"
                        type="submit"
                        style="width:100%"
                    >
                        Đăng ký
                    </button>
                </form>
            </div>

            <form
                class="box"
                data-form="lookup"
                novalidate
                style="margin-top:16px"
            >
                <h2>Tra cứu đơn hàng</h2>

                <div class="cp" style="margin:0">
                    <input
                        id="lid"
                        placeholder="Nhập mã đơn, ví dụ BL1A2B3C"
                        aria-label="Mã đơn hàng"
                    >

                    <button class="btn" type="submit">
                        Tra cứu
                    </button>
                </div>

                ${
                    orders().length
                        ? `
                            <div style="margin-top:12px">
                                ${orders().slice(0, 5).map(ordRow).join('')}
                            </div>
                        `
                        : ''
                }
            </form>
        `);
    }

    const u = S.user,
        mine = orders().filter(o => o.email === u.email);

    return page(`
        ${crumb([
            ['Trang chủ', '#/'],
            ['Tài khoản']
        ])}

        <h1 class="page-t">
            Xin chào, ${esc(u.name)}
        </h1>

        <div class="acc">
            <form class="box" data-form="profile" novalidate>
                <h2>Thông tin cá nhân</h2>

                ${fld('pname', 'Họ và tên', {
                    req: 1,
                    val: u.name
                })}

                ${fld('pemail', 'Email', {
                    type: 'email',
                    val: u.email,
                    attr: 'readonly'
                })}

                ${fld('pphone', 'Số điện thoại', {
                    type: 'tel',
                    val: u.phone
                })}

                ${fld('paddr', 'Địa chỉ giao hoa', {
                    val: u.address
                })}

                <div class="buy" style="margin-top:4px">
                    <button class="btn" type="submit">
                        Lưu thay đổi
                    </button>

                    <button
                        class="btn o"
                        type="button"
                        data-logout
                    >
                        Đăng xuất
                    </button>
                </div>
            </form>

            <div class="box">
                <h2>Đơn hàng của bạn</h2>

                ${
                    mine.length
                        ? mine.map(ordRow).join('')
                        : `
                            <p class="hint">
                                Bạn chưa có đơn hàng nào.
                            </p>

                            <a class="cta" href="#/san-pham">
                                Chọn hoa ngay
                            </a>
                        `
                }
            </div>
        </div>
    `);
}

const ordRow = o => {
    const [st, cls] = statusOf(o);

    return `
        <div class="ord">
            <div>
                <a href="#/don-hang/${o.id}">
                    ${o.id}
                </a>

                <small>
                    ${dt(o.created)}
                    ·
                    ${o.items.reduce((a, i) => a + i.q, 0)}
                    sản phẩm
                </small>
            </div>

            <div style="text-align:right">
                <b>${money(o.totals.total)}</b>
                <br>

                <span class="st ${cls}">
                    ${st}
                </span>
            </div>
        </div>
    `;
};

async function doAuth(form, kind) {
    const f = form.elements,
        db = users();

    if (kind === 'register') {
        if (!validate(form, {
            rname: rLen(2, 'Vui lòng nhập họ tên'),
            remail: rMail,
            rpass: rLen(6, 'Mật khẩu ít nhất 6 ký tự')
        })) {
            return;
        }

        const em = f.remail.value.trim().toLowerCase();

        if (db[em]) {
            setErr(form, 'remail', 'Email này đã được đăng ký');
            return;
        }

        db[em] = {
            name: f.rname.value.trim(),
            phone: '',
            address: '',
            hash: await sha(f.rpass.value)
        };

        LS.set('bl_users', db);

        S.user = {
            email: em,
            name: db[em].name,
            phone: '',
            address: ''
        };

        toast('Tạo tài khoản thành công');
    } else {
        if (!validate(form, {
            lemail: rMail,
            lpass: rLen(1, 'Nhập mật khẩu')
        })) {
            return;
        }

        const em = f.lemail.value.trim().toLowerCase(),
            u = db[em];

        if (!u || u.hash !== await sha(f.lpass.value)) {
            setErr(form, 'lpass', 'Email hoặc mật khẩu chưa đúng');
            return;
        }

        S.user = {
            email: em,
            name: u.name,
            phone: u.phone,
            address: u.address
        };

        toast('Đăng nhập thành công');
    }

    save();
    counts();
    route();
}
/* ---------- các trang còn lại ---------- */

function vFav() {
    const l = S.favs.map(byId).filter(Boolean);

    return page(`
        ${crumb([
            ['Trang chủ', '#/'],
            ['Yêu thích']
        ])}

        <h1 class="page-t">Sản phẩm yêu thích</h1>

        ${
            l.length
                ? `
                    <div class="grid fav4">
                        ${l.map(card).join('')}
                    </div>
                `
                : empty(
                    'Bạn chưa chọn sản phẩm nào. Bấm vào trái tim trên mỗi bó hoa để lưu lại.'
                )
        }
    `);
}

function vContact() {
    return page(`
        ${crumb([
            ['Trang chủ', '#/'],
            ['Liên hệ']
        ])}

        <h1 class="page-t">Liên hệ Bloomie</h1>

        <p class="lead">
            Cần tư vấn bó hoa theo yêu cầu hoặc đặt số lượng lớn?
            Để lại lời nhắn, Bloomie sẽ phản hồi sớm nhất có thể.
        </p>

        <form
            class="box"
            data-form="contact"
            novalidate
            style="max-width:640px"
        >
            ${fld('cname', 'Họ và tên', {
                req: 1,
                val: S.user && S.user.name
            })}

            ${fld('cmail', 'Email', {
                req: 1,
                type: 'email',
                val: S.user && S.user.email
            })}

            ${fld('cmsg', 'Nội dung', {
                req: 1,
                tag: 'textarea',
                attr: 'rows="4"'
            })}

            <button class="btn" type="submit">
                Gửi lời nhắn
            </button>
        </form>
    `);
}

function vService() {
    const r = [
        [
            'truck',
            'Giao hoa nhanh',
            'Giao trong 2 - 4 giờ tại Đà Nẵng. Có thể hẹn khung giờ cụ thể khi thanh toán.'
        ],
        [
            'shield',
            'Hoa tươi mỗi ngày',
            'Hoa được cắm trong ngày. Nếu hoa không tươi khi nhận, Bloomie sẽ đổi hoặc hoàn tiền.'
        ],
        [
            'gift',
            'Thanh toán an toàn',
            'Thanh toán khi nhận hoa, chuyển khoản hoặc ví điện tử.'
        ],
        [
            'phone',
            'Hỗ trợ 24/7',
            'Gửi lời nhắn ở trang liên hệ bất cứ lúc nào, kể cả cuối tuần và ngày lễ.'
        ]
    ];

    return page(`
        ${crumb([
            ['Trang chủ', '#/'],
            ['Dịch vụ']
        ])}

        <h1 class="page-t">Dịch vụ của Bloomie</h1>

        <div class="svc-page">
            ${
                r.map(x => `
                    <div class="box">
                        <div class="ic">
                            ${ic(x[0])}
                        </div>

                        <h2>${x[1]}</h2>

                        <p>${x[2]}</p>
                    </div>
                `).join('')
            }
        </div>
    `);
}

function vNotFound() {
    return page(
        crumb([
            ['Trang chủ', '#/'],
            ['Không tìm thấy']
        ]) +
        empty(
            'Trang bạn tìm không tồn tại.',
            '<a class="cta" href="#/">Về trang chủ</a>'
        )
    );
}

/* ---------- router ---------- */

function route() {
    clearInterval(heroT);
    closeAll();

    const raw = location.hash.slice(1) || '/',
        [path, qs] = raw.split('?'),
        q = Object.fromEntries(new URLSearchParams(qs || '')),
        seg = path.split('/').filter(Boolean);

    let html,
        title = 'Bloomie - Hoa tươi, gửi yêu thương',
        nav = '';

    switch (seg[0]) {
        case undefined:
            html = vHome();
            nav = 'home';
            break;

        case 'san-pham':
            html = vList(q);
            title = 'Sản phẩm | Bloomie';
            nav = 'san-pham';
            $('#q').value = q.q || '';
            break;

        case 'hoa': {
            const p = byId(seg[1]);

            html = vDetail(seg[1]);

            if (p) {
                title = p.name + ' | Bloomie';
            }

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

        default:
            html = vNotFound();
    }

    if (seg[0] !== 'san-pham') {
        $('#q').value = '';
    }

    $('#view').innerHTML = html;
    document.title = title;

    $$('[data-nav]').forEach(a =>
        a.classList.toggle('on', a.dataset.nav === nav)
    );

    window.scrollTo({ top: 0 });

    if (!seg[0]) {
        initHero();
    }

    counts();
}

window.addEventListener('hashchange', route);
/* ---------- sự kiện ---------- */

$('#searchForm').onsubmit = e => {
    e.preventDefault();

    const v = $('#q').value.trim();

    location.hash = '#/san-pham' + (
        v ? '?q=' + encodeURIComponent(v) : ''
    );
};

$('#ov').onclick = closeAll;
$('#btnCart').onclick = openDrawer;

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeAll();

        $$('.has-menu.open').forEach(m =>
            m.classList.remove('open')
        );
    }
});

document.addEventListener('change', e => {
    if (e.target.id === 'sortSel') {
        const [pa, qs] = location.hash.slice(1).split('?'),
            u = new URLSearchParams(qs || '');

        e.target.value
            ? u.set('sort', e.target.value)
            : u.delete('sort');

        const r = u.toString();

        location.hash = pa + (r ? '?' + r : '');
    }

    if (e.target.id === 'express') {
        $('#sumBox').innerHTML = sumHTML(e.target.checked);
    }
});

function refreshSummary() {
    const x = $('#express');

    if (!cartLines().length) {
        route();
        return;
    }

    $('#sumBox').innerHTML = sumHTML(x && x.checked);
}

document.addEventListener('click', e => {
    const t = e.target,
        c = s => t.closest(s);

    let el;

    if (el = c('.has-menu>.n')) {
        const li = el.parentElement,
            was = li.classList.contains('open');

        $$('.has-menu.open').forEach(m =>
            m.classList.remove('open')
        );

        if (!was) {
            li.classList.add('open');
            el.setAttribute('aria-expanded', 'true');
        }

        return;
    }

    $$('.has-menu.open').forEach(m =>
        m.classList.remove('open')
    );

    if (c('[data-close]')) {
        closeAll();
        return;
    }

    if (c('[data-checkout]')) {
        closeAll();
        location.hash = '#/thanh-toan';
        return;
    }

    if (el = c('[data-add]')) {
        addToCart(+el.dataset.add, 'M', 1);
        return;
    }

    if (el = c('[data-fav]')) {
        const id = +el.dataset.fav,
            i = S.favs.indexOf(id);

        if (i < 0) {
            S.favs.push(id);
            toast('Đã thêm vào yêu thích');
        } else {
            S.favs.splice(i, 1);
        }

        save();
        counts();
        bump($('#favN'));

        if (location.hash.startsWith('#/yeu-thich')) {
            route();
        } else {
            $$(`[data-fav="${id}"]`).forEach(b => {
                b.classList.toggle('on', i < 0);
                b.setAttribute('aria-pressed', i < 0);
            });
        }

        return;
    }

    if (el = c('[data-size]')) {
        D.size = el.dataset.size;
        updateDetail();
        return;
    }

    if (el = c('[data-dq]')) {
        D.qty = Math.max(
            1,
            Math.min(20, D.qty + +el.dataset.dq)
        );

        updateDetail();
        return;
    }

    if (c('[data-addd]')) {
        addToCart(D.id, D.size, D.qty);
        return;
    }

    if (c('[data-buy]')) {
        addToCart(D.id, D.size, D.qty);
        location.hash = '#/thanh-toan';
        return;
    }

    if (el = c('[data-inc]')) {
        changeQty(el.dataset.inc, 1);
        return;
    }

    if (el = c('[data-dec]')) {
        changeQty(el.dataset.dec, -1);
        return;
    }

    if (el = c('[data-rm]')) {
        delete S.cart[el.dataset.rm];
        save();
        renderDrawer();
        return;
    }

    if (el = c('[data-cinc]')) {
        changeQty(el.dataset.cinc, 1);
        refreshSummary();
        return;
    }

    if (el = c('[data-cdec]')) {
        changeQty(el.dataset.cdec, -1);
        refreshSummary();
        return;
    }

    if (el = c('[data-crm]')) {
        delete S.cart[el.dataset.crm];
        save();
        renderDrawer();
        refreshSummary();
        return;
    }

    if (c('[data-capply]')) {
        const v = $('#cin').value.trim().toUpperCase();

        if (COUPONS[v]) {
            S.coupon = v;
            save();
            refreshSummary();
            toast('Đã áp dụng mã ' + v);
        } else {
            toast('Mã giảm giá không hợp lệ');
        }

        return;
    }

    if (c('[data-coff]')) {
        S.coupon = '';
        save();
        refreshSummary();
        return;
    }

    if (el = c('[data-coupon]')) {
        S.coupon = el.dataset.coupon;
        save();
        renderDrawer();

        toast(
            'Đã nhận mã ' + S.coupon +
            ': giảm 10% đơn đầu tiên'
        );

        return;
    }

    if (el = c('[data-cancel]')) {
        const l = orders().map(o =>
            o.id === el.dataset.cancel
                ? { ...o, cancelled: true }
                : o
        );

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
        route();
        return;
    }
});

document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-form]');

    if (!form) {
        return;
    }

    e.preventDefault();

    switch (form.dataset.form) {
        case 'checkout':
            placeOrder(form);
            break;

        case 'login':
            doAuth(form, 'login');
            break;

        case 'register':
            doAuth(form, 'register');
            break;

        case 'lookup': {
            const v = $('#lid').value.trim().toUpperCase();

            if (v) {
                location.hash = '#/don-hang/' + encodeURIComponent(v);
            }

            break;
        }

        case 'profile': {
            if (!validate(form, {
                pname: rLen(2, 'Vui lòng nhập họ tên')
            })) {
                return;
            }

            const f = form.elements,
                db = users();

            S.user = {
                ...S.user,
                name: f.pname.value.trim(),
                phone: f.pphone.value.trim(),
                address: f.paddr.value.trim()
            };

            if (db[S.user.email]) {
                db[S.user.email] = {
                    ...db[S.user.email],
                    name: S.user.name,
                    phone: S.user.phone,
                    address: S.user.address
                };

                LS.set('bl_users', db);
            }

            save();
            counts();
            toast('Đã lưu thông tin');
            break;
        }

        case 'contact': {
            if (!validate(form, {
                cname: rLen(2, 'Vui lòng nhập họ tên'),
                cmail: rMail,
                cmsg: rLen(5, 'Vui lòng nhập nội dung')
            })) {
                return;
            }

            const f = form.elements;

            LS.set('bl_msgs', [
                {
                    t: Date.now(),
                    name: f.cname.value,
                    email: f.cmail.value,
                    msg: f.cmsg.value
                },
                ...LS.get('bl_msgs', [])
            ]);

            form.reset();

            toast('Đã gửi lời nhắn. Bloomie sẽ phản hồi sớm.');
            break;
        }
    }
});

/* ---------- khởi động ---------- */
renderDrawer();route();
})();
