// 1. Supabase Initialization (Corrected)
const SUPABASE_URL = "https://rsjgrotznorgavudjpsp.supabase.co";
const SUPABASE_KEY = "sb_publishable_0zxG8sugxvwEKpBMhII87Q_HBOqwtM9";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global Variables
let demoBalance = 10000, realBalance = 0, currentType = 'DEMO', wallet = 10000;
let activeSym = 'BTCUSDT', livePrice = 0, trades = [], ws;

// 2. Data Fetching Logic (New)
async function fetchUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
            realBalance = profile.real_balance || 0;
            demoBalance = profile.demo_balance || 10000;
            // Shuruat mein wallet ko demo par rakhte hain
            wallet = (currentType === 'REAL') ? realBalance : demoBalance;
            updateBalanceUI();
        }
    } else {
        window.location.href = "index.html"; // Login nahi hai toh bahar bhej do
    }
}

// 3. Balance & Account Logic
function updateBalanceUI() {
    const el = document.getElementById('user-balance');
    if(el) el.innerText = "$" + wallet.toLocaleString(undefined, {minimumFractionDigits: 2});
}

function switchAccount(val) {
    currentType = val;
    wallet = (val === 'REAL') ? realBalance : demoBalance;
    updateBalanceUI();
}

function depositFunds() {
    if (currentType === 'REAL') {
        document.getElementById('payment-modal').style.display = 'flex';
    } else {
        let amt = prompt("Enter Demo Deposit Amount:", "1000");
        if (amt && !isNaN(amt)) { 
            wallet += parseFloat(amt); 
            demoBalance = wallet; 
            updateBalanceUI(); 
        }
    }
}

function requestWithdraw() {
    let amount = prompt("Enter Withdrawal Amount:", "500");
    if (amount && amount <= wallet) {
        window.open(`https://wa.me/8403069708?text=Withdrawal Request: $${amount}`);
    } else { alert("Insufficient Balance or Invalid Amount!"); }
}

// 4. Chart & Price Logic
 function initChart(sym) {
    if (typeof TradingView === 'undefined') {
        console.error("TradingView library load nahi hui!");
        return;
    }
    
    new TradingView.widget({
        "autosize": true,
        "symbol": sym,
        "interval": "1",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "container_id": "tv_chart_main" // Dashboard ke div ki ID se match hona chahiye
    });
 }


function startStream(sym) {
    if (ws) ws.close();
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@trade`);
    ws.onmessage = (e) => { 
        const data = JSON.parse(e.data);
        livePrice = parseFloat(data.p); 
        updatePNLs(); 
    };
}

function switchMarket(full, base, el) {
    activeSym = base;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    initChart(full); 
    startStream(base);
}

// 5. Trading Execution
function openTrade(side) {
    const amt = parseFloat(document.getElementById('tAmt').value);
    if (amt > wallet) return alert("Low Balance!");
    if (livePrice === 0) return alert("Waiting for price...");
    
    trades.push({ id: Date.now(), sym: activeSym, side: side, entry: livePrice, amt: amt });
    wallet -= amt; // Amount deduct karein
    updateBalanceUI();
    render();
}

function updatePNLs() {
    trades.forEach(t => {
        const el = document.getElementById(`pnl-${t.id}`);
        if (!el) return;
        let pnl = (t.side === 'BUY' ? livePrice - t.entry : t.entry - livePrice) * (t.amt / t.entry);
        el.innerText = pnl.toFixed(2);
        el.className = pnl >= 0 ? "pnl-up" : "pnl-down";
    });
}

function render() {
    const list = document.getElementById('position-list');
    if(!list) return;
    list.innerHTML = trades.map(t => `
        <tr>
            <td>${t.sym} (${t.side})</td>
            <td>${t.entry.toFixed(2)}</td>
            <td id="pnl-${t.id}">0.00</td>
            <td><button onclick="closeTrade(${t.id})" style="background:#f6465d; color:white; border:none; border-radius:3px; padding:4px 8px; cursor:pointer;">Close</button></td>
        </tr>`).join('');
}

function closeTrade(id) {
    const i = trades.findIndex(t => t.id === id);
    if (i > -1) {
        let pnlEl = document.getElementById(`pnl-${id}`);
        let currentPnl = pnlEl ? parseFloat(pnlEl.innerText) : 0;
        
        // PNL + invested amount wapas wallet mein
        wallet += (trades[i].amt + currentPnl);
        
        if (currentType === 'DEMO') demoBalance = wallet; else realBalance = wallet;
        
        trades.splice(i, 1); 
        updateBalanceUI(); 
        render();
    }
}

// 6. Modal Functions
function showPay(t) {
    document.getElementById('upi-pay').style.display = (t === 'upi') ? 'block' : 'none';
    document.getElementById('crypto-pay').style.display = (t === 'crypto') ? 'block' : 'none';
}

function closePay() { 
    document.getElementById('payment-modal').style.display = 'none'; 
}

function copyAddress() { 
    const addr = document.getElementById("usdt-addr");
    addr.select();
    navigator.clipboard.writeText(addr.value); 
    alert("USDT Address Copied!"); 
}

function confirmPay() { 
    window.open(`https://wa.me/8403069708?text=Hi, I have paid. My Email: ${document.getElementById('display-email')?.innerText || 'Trader'}`); 
    closePay(); 
}

// 7. Initialize Everything
window.onload = () => {
    fetchUserData();
    initChart('BINANCE:BTCUSDT'); 
    startStream('BTCUSDT');
};
