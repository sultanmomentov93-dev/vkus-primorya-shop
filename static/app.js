const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }
const initData = tg?.initData || "";
const state = { products: [], cart: {}, favorites: new Set(), category: "Все сорта", screen: "home", selectedProduct: null, delivery: "Почта России" };
const $ = (id) => document.getElementById(id);
const categoryEmoji = {"Клубника":"🍓","Малина":"🍇","Голубика":"🫐"};
const descriptions = {
  "Азия":"Саженец клубники сорта Азия.",
  "Априка":"Саженец клубники сорта Априка.",
  "Клери":"Саженец клубники сорта Клери.",
  "Флёр":"Саженец клубники сорта Флёр.",
  "Мурано":"Саженец клубники сорта Мурано.",
  "G-7":"Саженец клубники сорта G-7.",
  "Маджестик":"Саженец малины сорта Маджестик.",
  "Маргарита":"Саженец малины сорта Маргарита.",
  "Мапема":"Саженец малины сорта Мапема.",
  "Вайолет":"Саженец малины сорта Вайолет.",
  "Дюк":"Саженец голубики сорта Дюк.",
  "Блюкроп":"Саженец голубики сорта Блюкроп.",
  "Бонус":"Саженец голубики сорта Бонус.",
  "Легаси":"Саженец голубики сорта Легаси."
};
function money(n){return new Intl.NumberFormat("ru-RU").format(n)+" ₽";}
function emoji(p){return categoryEmoji[p.category] || "🌱";}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200);}
function count(){return Object.values(state.cart).reduce((a,b)=>a+b,0);}
function total(){return state.products.reduce((s,p)=>s+(state.cart[p.id]||0)*p.price,0);}
function setTab(tab){document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.tab===tab));}
function productCard(p){
 const qty=state.cart[p.id]||0, fav=state.favorites.has(p.id);
 return `<article class="product-card"><div class="product-art ${p.category.toLowerCase()}"><span>${emoji(p)}</span><button class="favorite" data-fav="${p.id}" aria-label="В избранное">${fav?"♥":"♡"}</button></div><div class="product-info"><div class="product-category">${p.category}</div><div class="product-name">${p.name}</div><div class="product-desc">${descriptions[p.name]}</div><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-button" data-add="${p.id}">${qty?qty+" +":"+"}</button></div></div></article>`;
}
function bindProductButtons(){
 document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const id=b.dataset.add;state.cart[id]=(state.cart[id]||0)+1;updateBadges();if(state.screen==="catalog")renderCatalog();else if(state.screen==="home")renderHome();toast("Добавлено в корзину");});
 document.querySelectorAll("[data-fav]").forEach(b=>b.onclick=()=>{const id=b.dataset.fav;state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);if(state.screen==="favorites")renderFavorites();else if(state.screen==="home")renderHome();else renderCatalog();});
 document.querySelectorAll(".product-card").forEach(card=>card.addEventListener("click",e=>{if(e.target.closest("button"))return;const id=card.querySelector("[data-add]")?.dataset.add;if(id)renderDetail(id);}));
}
function updateBadges(){const n=count();$("navCartCount").textContent=n;$("navCartCount").style.display=n?"flex":"none";$("cartDot").style.display=n?"block":"none";}
function renderHome(){
 state.screen="home";setTab("home");
 $("view").innerHTML=`<section class="hero"><div class="hero-kicker">🌱 С ЛЮБОВЬЮ К САДУ</div><h1>Вкус Приморья</h1><p>Саженцы клубники, малины и голубики для вашего сада. Выбирайте любимые сорта и оформляйте заказ прямо здесь.</p><div class="hero-pills"><span>🌿 Бережно выращиваем</span><span>📦 Почта России и СДЭК</span></div></section><section class="benefits"><div><b>14</b><span>сортов саженцев</span></div><div><b>3</b><span>категории</span></div><div><b>2</b><span>способа доставки</span></div></section><section class="section"><div class="section-heading"><div><span class="eyebrow">НАШ АССОРТИМЕНТ</span><h2>Выберите категорию</h2></div><span class="muted">14 сортов</span></div><div class="category-grid"><button class="category-card strawberry" data-category="Клубника"><span class="category-emoji">🍓</span><b>Клубника</b><small>6 сортов</small><span class="category-arrow">→</span></button><button class="category-card raspberry" data-category="Малина"><span class="category-emoji">🍇</span><b>Малина</b><small>4 сорта</small><span class="category-arrow">→</span></button><button class="category-card blueberry" data-category="Голубика"><span class="category-emoji">🫐</span><b>Голубика</b><small>4 сорта</small><span class="category-arrow">→</span></button></div></section><section class="section"><div class="section-heading"><div><span class="eyebrow">ПОПУЛЯРНОЕ</span><h2>Сорта для вашего сада</h2></div><button class="text-button" id="allCatalog">Весь каталог →</button></div><div class="product-grid" id="featured"></div></section><section class="delivery-note"><span>📦</span><div><b>Доставляем по России</b><p>Выберите Почту России или СДЭК при оформлении заказа.</p></div></section>`;
 $("view").querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{state.category=b.dataset.category;renderCatalog();});
 $("allCatalog").onclick=()=>{state.category="Все сорта";renderCatalog();};
 $("featured").innerHTML=state.products.slice(0,4).map(productCard).join("");bindProductButtons();
}
function renderCatalog(){
 state.screen="catalog";setTab("catalog");
 const cats=["Все сорта","Клубника","Малина","Голубика"];
 const filtered=state.category==="Все сорта"?state.products:state.products.filter(p=>p.category===state.category);
 $("view").innerHTML=`<h1 class="page-title">Каталог саженцев</h1><p class="page-subtitle">Выберите сорт, чтобы посмотреть карточку и добавить его в корзину.</p><div class="chips">${cats.map(c=>`<button class="chip ${state.category===c?"active":""}" data-chip="${c}">${c==="Все сорта"?"Все сорта":categoryEmoji[c]+" "+c}</button>`).join("")}</div><section class="section"><div class="section-heading"><h2>${state.category}</h2><span class="muted">${filtered.length} сортов</span></div><div class="product-grid">${filtered.map(productCard).join("")||'<div class="empty">В этой категории пока нет товаров.</div>'}</div></section>`;
 $("view").querySelectorAll("[data-chip]").forEach(b=>b.onclick=()=>{state.category=b.dataset.chip;renderCatalog();});
 bindProductButtons();
}
function renderDetail(id){
 const p=state.products.find(x=>x.id===id);if(!p)return;
 state.screen="detail";state.selectedProduct=id;
 const qty=state.cart[id]||0;
 $("view").innerHTML=`<section class="detail"><button class="back-button" id="backDetail">← Назад в каталог</button><div class="detail-art">${emoji(p)}</div><div class="product-category">${p.category}</div><h1>${p.name}</h1><div class="detail-price">${money(p.price)} <small style="font-size:12px;color:#7b847d">/ шт.</small></div><p class="detail-copy">${descriptions[p.name]}<br><br>Точная информация о характеристиках и наличии уточняется у менеджера перед подтверждением заказа.</p><div class="qty-control"><button id="minus">−</button><b>${qty} шт.</b><button id="plus">+</button></div><button class="primary-button" id="detailAdd">Добавить в корзину</button></section>`;
 $("backDetail").onclick=renderCatalog;
 $("minus").onclick=()=>{state.cart[id]=Math.max(0,(state.cart[id]||0)-1);if(!state.cart[id])delete state.cart[id];updateBadges();renderDetail(id);};
 $("plus").onclick=()=>{state.cart[id]=(state.cart[id]||0)+1;updateBadges();renderDetail(id);};
 $("detailAdd").onclick=()=>{state.cart[id]=(state.cart[id]||0)+1;updateBadges();toast("Добавлено в корзину");renderDetail(id);};
}
function renderFavorites(){
 state.screen="favorites";setTab("favorites");
 const list=state.products.filter(p=>state.favorites.has(p.id));
 $("view").innerHTML=`<h1 class="page-title">Избранное</h1><p class="page-subtitle">Сохранённые сорта, которые вам понравились.</p>${list.length?`<section class="section"><div class="product-grid">${list.map(productCard).join("")}</div></section>`:'<div class="empty">♡<b>Пока ничего нет</b>Добавляйте понравившиеся сорта в избранное.</div>'}`;
 bindProductButtons();
}
function renderCart(){
 state.screen="cart";setTab("cart");
 const items=state.products.filter(p=>state.cart[p.id]);
 $("view").innerHTML=`<h1 class="page-title">Корзина</h1><p class="page-subtitle">Проверьте выбранные саженцы перед оформлением.</p>${items.length?`<div class="cart-list">${items.map(p=>`<div class="cart-row"><span class="cart-emoji">${emoji(p)}</span><div class="cart-row-main"><b>${p.name}</b><small>${money(p.price)} за штуку</small></div><div class="mini-qty"><button data-dec="${p.id}">−</button><b>${state.cart[p.id]}</b><button data-inc="${p.id}">+</button></div></div>`).join("")}</div><div class="total-line"><span>Итого</span><span>${money(total())}</span></div><div class="checkout"><button class="primary-button" id="goCheckout">Перейти к оформлению →</button></div>`:'<div class="empty">🛒<b>Корзина пока пуста</b>Выберите сорта в каталоге и добавьте их сюда.</div>'}`;
 $("view").querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>{const id=b.dataset.dec;state.cart[id]--;if(state.cart[id]<=0)delete state.cart[id];updateBadges();renderCart();});
 $("view").querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>{const id=b.dataset.inc;state.cart[id]++;updateBadges();renderCart();});
 if($("goCheckout"))$("goCheckout").onclick=renderCheckout;
}
function renderCheckout(){
 state.screen="checkout";setTab("cart");
 $("view").innerHTML=`<section class="checkout"><button class="back-button" id="backCart">← Вернуться в корзину</button><h1>Оформление заказа</h1><p class="page-subtitle" style="margin:4px 0 18px">Оставьте контактные данные и выберите доставку.</p><h3>Контактные данные</h3><label class="field"><span>Ваше имя</span><input id="customerName" autocomplete="name" placeholder="Как к вам обращаться"></label><label class="field"><span>Телефон</span><input id="phone" type="tel" autocomplete="tel" placeholder="+7 900 000-00-00"></label><h3>Способ доставки</h3><div class="delivery-options"><button class="delivery-option ${state.delivery==="Почта России"?"selected":""}" data-delivery="Почта России">📮 Почта России</button><button class="delivery-option ${state.delivery==="СДЭК"?"selected":""}" data-delivery="СДЭК">📦 СДЭК</button></div><label class="field"><span>Город, адрес или индекс / пункт выдачи</span><textarea id="address" placeholder="Укажите город и адрес или пункт выдачи"></textarea></label><div class="total-line" style="padding:14px 0"><span>К оплате по товарам</span><span>${money(total())}</span></div><p class="detail-copy">Стоимость доставки и способ оплаты менеджер согласует с вами отдельно. Заказ будет отправлен в группу магазина для подтверждения.</p><button class="primary-button" id="submitOrder">Подтвердить заказ</button></section>`;
 $("backCart").onclick=renderCart;
 $("view").querySelectorAll("[data-delivery]").forEach(b=>b.onclick=()=>{state.delivery=b.dataset.delivery;renderCheckout();});
 $("submitOrder").onclick=submitOrder;
}
async function submitOrder(){
 const name=$("customerName").value.trim(),phone=$("phone").value.trim(),address=$("address").value.trim();
 if(name.length<2||phone.length<5||address.length<3){toast("Заполните имя, телефон и адрес доставки");return;}
 const items=state.products.filter(p=>state.cart[p.id]).map(p=>({id:p.id,quantity:state.cart[p.id]}));
 const button=$("submitOrder");button.disabled=true;button.textContent="Отправляем заказ…";
 try{
  const res=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({init_data:initData,customer_name:name,phone,delivery_method:state.delivery,address,items})});
  const data=await res.json();if(!res.ok)throw new Error(data.detail||"Не удалось отправить заказ");
  state.cart={};updateBadges();state.screen="success";setTab("home");
  $("view").innerHTML=`<div class="empty" style="margin-top:45px;padding:38px 22px">🌿<h2>Спасибо за заказ!</h2><b>Заказ №${data.order_id} принят</b><p>Мы свяжемся с вами для подтверждения деталей и доставки.</p><p class="status">${data.notification_sent?"Уведомление отправлено менеджеру":"Заказ сохранён; уведомление менеджеру не настроено"}</p><button class="primary-button" id="backHome" style="margin-top:18px">На главную</button></div>`;
  $("backHome").onclick=renderHome;
 }catch(e){toast(e.message);button.disabled=false;button.textContent="Подтвердить заказ";}
}
function renderProfile(){
 state.screen="profile";setTab("profile");
 const user=tg?.initDataUnsafe?.user;
 const fullName=user?[user.first_name,user.last_name].filter(Boolean).join(" "):"Покупатель";
 $("view").innerHTML=`<h1 class="page-title">Профиль</h1><div class="profile-card"><span class="eyebrow">ВАШ АККАУНТ</span><p style="font-size:32px;margin:10px 0">👤</p><b>${fullName}</b><p>${user?.username?"@"+user.username:"Магазин «Вкус Приморья»"}</p><p>Ваши контактные данные мы попросим при оформлении каждого заказа.</p></div><div class="profile-card"><b>Доставка</b><p>Доступны только Почта России и СДЭК. Стоимость и детали доставки согласуются с менеджером.</p></div>`;
}
function navigate(tab){if(tab==="home")renderHome();if(tab==="catalog"){state.category="Все сорта";renderCatalog();}if(tab==="favorites")renderFavorites();if(tab==="cart")renderCart();if(tab==="profile")renderProfile();}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>navigate(b.dataset.tab));
$("headerCart").onclick=renderCart;
fetch("/api/products").then(r=>r.json()).then(data=>{state.products=data;updateBadges();renderHome();}).catch(()=>{$("view").innerHTML='<div class="empty">Не удалось загрузить каталог. Обновите страницу позже.</div>';});
