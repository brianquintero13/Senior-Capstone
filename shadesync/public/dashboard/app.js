// Theme
const body = document.body;
const setThemeByTime = () => {
    const h = new Date().getHours();
    body.className = (h >= 6 && h < 18) ? "theme-day" : "theme-night";
};
setThemeByTime();
document.getElementById("dayBtn").onclick = () => (body.className = "theme-day");
document.getElementById("nightBtn").onclick = () => (body.className = "theme-night");

// Clock
const clockEl = document.getElementById("clock");
function updateClock(){
    const d = new Date();
    let h = d.getHours(), m = d.getMinutes();
    const am = h < 12;
    h = h % 12 || 12;
    const mm = String(m).padStart(2,"0");
    clockEl.innerHTML = `${h}:${mm}<span class="ampm">${am?"am":"pm"}</span>`;
}
updateClock();
setInterval(()=>{ updateClock(); setThemeByTime(); }, 1000);

// Segmented Open/Close
const segOpen = document.getElementById("segOpen");
const segClose = document.getElementById("segClose");
[segOpen, segClose].forEach(b=>b.addEventListener("click", ()=>{
    segOpen.classList.toggle("active", b===segOpen);
    segClose.classList.toggle("active", b===segClose);
}));

// Suggestion bar
const suggestion = document.getElementById("suggestion");
document.getElementById("suggestYes").onclick = ()=>{
    localStorage.setItem("autoCloseTime","21:30");
    suggestion.style.display = "none";
    toast("Applied suggestion: daily close at 9:30 pm");
};
document.getElementById("suggestNo").onclick = ()=> suggestion.style.display = "none";

// Manual control
const manualToggle = document.getElementById("manualToggle");
manualToggle.addEventListener("change", ()=>{
    toast(manualToggle.checked ? "Manual control enabled" : "Manual control disabled");
});

// Big buttons (hook ESP32 later)
document.getElementById("btnOpen").onclick = ()=> runAction("OPEN");
document.getElementById("btnClose").onclick = ()=> runAction("CLOSE");
function runAction(cmd){
    // Example (uncomment and set your device URL later):
    // fetch("http://esp32.local/api/act?cmd="+cmd).catch(()=>{});
    toast(`${cmd} command sent`);
}

// Modals
function openModal(id){ document.getElementById(id).hidden = false; }
function closeModal(id){ document.getElementById(id).hidden = true; }
document.getElementById("btnAutoTime").onclick = ()=> openModal("modalAutoTime");
document.getElementById("btnDisable").onclick = ()=> openModal("modalDisable");
document.querySelectorAll("[data-close]").forEach(btn=>{
    btn.addEventListener("click", ()=> closeModal(btn.dataset.close));
});

// Auto Time modal
let autoMode = "open";
const autoOpen = document.getElementById("autoOpen");
const autoClose = document.getElementById("autoClose");
[autoOpen, autoClose].forEach(b=>b.addEventListener("click", ()=>{
    autoMode = (b===autoOpen) ? "open" : "close";
    autoOpen.classList.toggle("active", autoMode==="open");
    autoClose.classList.toggle("active", autoMode==="close");
}));

const dowBtns = Array.from(document.querySelectorAll(".dow-btn"));
dowBtns.forEach(btn=> btn.addEventListener("click", ()=> btn.classList.toggle("active")));

document.getElementById("saveAuto").onclick = ()=>{
    const t = document.getElementById("autoTime").value;
    const days = dowBtns.filter(b=>b.classList.contains("active")).map(b=>b.dataset.d);
    if(!t || days.length===0){ toast("Pick a time and at least one day"); return; }
    const key = autoMode==="open" ? "autoOpen" : "autoClose";
    localStorage.setItem(key, JSON.stringify({ time:t, days }));
    closeModal("modalAutoTime");
    toast(`Saved ${autoMode} at ${t} for ${days.join(", ")}`);
};

// Disable modal
document.getElementById("saveDisable").onclick = ()=>{
    const scope = document.querySelector('input[name="disScope"]:checked').value;
    if(scope==="today") localStorage.setItem("scheduleDisabledToday","1");
    else localStorage.setItem("scheduleDisabledAll","1");
    closeModal("modalDisable");
    toast(scope==="today" ? "Disabled for today" : "Disabled entire schedule");
};

// Tiny toast
function toast(msg){
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(()=> t.classList.add("show"));
    setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=> t.remove(), 180); }, 2000);
}
const toastCss = document.createElement("style");
toastCss.textContent = `.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(8px);background:#122041;color:#cfe3ff;padding:10px 14px;border:1px solid #25406f;border-radius:10px;opacity:0;transition:.2s;box-shadow:0 10px 24px rgba(0,0,0,.35)}.toast.show{opacity:1;transform:translateY(0)}`;
document.head.appendChild(toastCss);
