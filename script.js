const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

// Menu items: [name, category, emoji, description, price]
const P=[
["Classic Burger","Burgers","🍔","Beef patty, cheddar, pickles",6.5],["Spicy Chicken Burger","Burgers","🍗","Crispy chicken, chili mayo",7],
["Margherita Pizza","Pizza","🍕","Tomato, mozzarella, basil",9],["Pepperoni Pizza","Pizza","🍕","Loaded with pepperoni",10.5],
["Khmer food","Asian","🍜","Rice noodles, peanuts, lime",7.5],["Sushi Set","Asian","🍣","12 pieces, soy and wasabi",13],
["Garden Salad","Healthy","🥗","Greens, avocado, vinaigrette",6],["Veggie Bowl","Healthy","🥙","Quinoa, roasted veg, tahini",7.5],
["Choco Lava Cake","Dessert","🍰","Warm center, vanilla cream",4.5],["Mango Ice Cream","Dessert","🍨","Three scoops, fresh mango",4]];

// Safe wrapper around localStorage (it can fail in private mode)
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

let cart=store.get("ef_cart",{}),user=store.get("ef_user",null),cat="All";
const money=n=>"$"+n.toFixed(2);

function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("on"),2200)}

/* ---------- Page switching ---------- */
function route(){
  const h=(location.hash||"#home").slice(1);
  const id=$("#"+h)&&$("#"+h).classList.contains("view")?h:"home";
  $$(".view").forEach(v=>v.classList.toggle("on",v.id===id));
  $$(".menu a.link,.mnav a").forEach(a=>a.classList.toggle("active",a.hash==="#"+id));
  scrollTo(0,0);
}
addEventListener("hashchange",route);route();

/* ---------- Shop ---------- */
function drawShop(){
  const cats=["All",...new Set(P.map(p=>p[1]))];
  $("#filters").innerHTML=cats.map(c=>`<button class="${c===cat?"on":""}" data-c="${c}">${c}</button>`).join("");
  $("#products").innerHTML=P.map((p,i)=>({p,i})).filter(o=>cat==="All"||o.p[1]===cat).map(({p,i})=>`<div class="card"><div class="em" aria-hidden="true">${p[2]}</div><h3>${p[0]}</h3><p>${p[3]}</p><div class="row"><span class="price">${money(p[4])}</span><button class="btn btn-primary" data-add="${i}">Add</button></div></div>`).join("");
}
drawShop();
$("#filters").onclick=e=>{if(e.target.dataset.c){cat=e.target.dataset.c;drawShop()}};
$("#products").onclick=e=>{const i=e.target.dataset.add;if(i!==undefined){cart[i]=(cart[i]||0)+1;saveCart();toast(P[i][0]+" added")}};

/* ---------- Cart ---------- */
function saveCart(){store.set("ef_cart",cart);drawCart()}
function drawCart(){
  const ids=Object.keys(cart).filter(i=>P[i]&&cart[i]>0);
  const n=ids.reduce((s,i)=>s+cart[i],0);
  $("#count").textContent=n;
  $("#cartBtn").setAttribute("aria-label","Cart, "+n+" items");
  $("#lines").innerHTML=ids.length?ids.map(i=>`<div class="line"><span>${P[i][2]}</span><div>${P[i][0]}<br><small>${money(P[i][4])}</small></div><div class="q"><button data-m="${i}" aria-label="Less">−</button>${cart[i]}<button data-p="${i}" aria-label="More">+</button></div></div>`).join(""):"<p class='sub'>Your cart is empty.</p>";
  $("#total").textContent=money(ids.reduce((s,i)=>s+cart[i]*P[i][4],0));
  $("#checkout").disabled=!ids.length;
}
$("#lines").onclick=e=>{const d=e.target.dataset;if(d.p)cart[d.p]++;if(d.m&&--cart[d.m]<=0)delete cart[d.m];saveCart()};
$("#cartBtn").onclick=()=>$("#cartDlg").showModal();
$("#checkout").onclick=()=>{
  if(!user){$("#cartDlg").close();openAuth("login");toast("Please log in to checkout");return}
  cart={};saveCart();$("#cartDlg").close();toast("Order placed, thanks "+user.name.split(" ")[0]+"!");
};
$$("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
$$("dialog").forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close()}));

/* ---------- Login and Register ---------- */
let mode="login";
async function hash(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}

function openAuth(m){
  mode=m;const r=m==="register";
  $("#aTitle").textContent=r?"Create account":"Login";
  $("#aSubmit").textContent=r?"Register":"Login";
  $("#nameRow").style.display=$("#pw2Row").style.display=r?"":"none";
  $("#aErr").textContent="";
  $("#aSwap").innerHTML=r?'Have an account? <a href="#" style="color:var(--brand);font-weight:600" data-sw="login">Login</a>':'New here? <a href="#" style="color:var(--brand);font-weight:600" data-sw="register">Register</a>';
  if(!$("#authDlg").open)$("#authDlg").showModal();
}
$("#aSwap").onclick=e=>{if(e.target.dataset.sw){e.preventDefault();openAuth(e.target.dataset.sw)}};
$("#loginBtn").onclick=()=>openAuth("login");
$("#regBtn").onclick=()=>openAuth("register");

$("#aForm").onsubmit=async e=>{
  e.preventDefault();
  const f=e.target,em=f.email.value.trim().toLowerCase(),pw=f.pw.value,err=$("#aErr");
  if(!/^\S+@\S+\.\S+$/.test(em))return err.textContent="Enter a valid email.";
  if(pw.length<6)return err.textContent="Password must be at least 6 characters.";
  const users=store.get("ef_users",{});
  if(mode==="register"){
    const nm=f.name.value.trim();
    if(!nm)return err.textContent="Enter your name.";
    if(pw!==f.pw2.value)return err.textContent="Passwords do not match.";
    if(users[em])return err.textContent="That email is already registered.";
    users[em]={name:nm,h:await hash(pw)};store.set("ef_users",users);user={name:nm,email:em};
  }else{
    const u=users[em];
    if(!u||u.h!==await hash(pw))return err.textContent="Wrong email or password.";
    user={name:u.name,email:em};
  }
  store.set("ef_user",user);f.reset();$("#authDlg").close();drawAuth();
  toast("Welcome, "+user.name.split(" ")[0]+"!");
};

function drawAuth(){
  $("#auth").innerHTML=user
    ?`<span style="font-weight:600">Hi, ${user.name.split(" ")[0].replace(/[<&]/g,"")}</span> <button class="btn btn-ghost" id="out">Logout</button>`
    :`<button class="btn btn-ghost" id="loginBtn">Login</button> <button class="btn btn-primary" id="regBtn">Register</button>`;
  if(user)$("#out").onclick=()=>{user=null;store.set("ef_user",null);drawAuth();toast("Logged out")};
  else{$("#loginBtn").onclick=()=>openAuth("login");$("#regBtn").onclick=()=>openAuth("register")}
}

/* ---------- Contact form ---------- */
$("#contactForm").onsubmit=e=>{
  e.preventDefault();
  const f=e.target,err=$("#cErr");$("#cOk").textContent="";
  if(!f.name.value.trim()||!f.msg.value.trim())return err.textContent="Please fill in your name and message.";
  if(!/^\S+@\S+\.\S+$/.test(f.email.value))return err.textContent="Enter a valid email.";
  err.textContent="";f.reset();$("#cOk").textContent="Thanks! We’ll get back to you soon.";
};

drawCart();drawAuth();