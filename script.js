// Global Variables
let demoBalance = 10000, realBalance = 0, currentType = 'DEMO', wallet = 10000;
let activeSym = 'BTCUSDT', livePrice = 0, trades = [], ws;

// 1. Balance & Account Logic
function updateBalanceUI() {
    document.getElementById('user-balance').innerText = "$" + wallet.toLocaleString(undefined, {minimumFractionDigits: 2});
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

// 2. Chart & Price Logic
function initChart(sym) {
    new TradingView.widget({ 
        "autosize": true, 
        "symbol": sym, 
        "interval": "1", 
        "theme": "dark", 
        "container_id": "tv_chart_main", 
        "hide_side_toolbar": false 
    });
}

function startStream(sym) {
    if (ws) ws.close();
    ws = new WebSocket(`wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@trade`);
    ws.onmessage = (e) => { 
        livePrice = parseFloat(JSON.parse(e.data).p); 
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

// 3. Trading Execution
function openTrade(side) {
    const amt = parseFloat(document.getElementById('tAmt').value);
    if (amt > wallet) return alert("Low Balance!");
    trades.push({ id: Date.now(), sym: activeSym, side: side, entry: livePrice, amt: amt });
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
    document.getElementById('position-list').innerHTML = trades.map(t => `
        <tr>
            <td>${t.sym} (${t.side})</td>
            <td>${t.entry.toFixed(2)}</td>
            <td id="pnl-${t.id}">0.00</td>
            <td><button onclick="closeTrade(${t.id})" style="background:#474d57; color:white; border:none; border-radius:3px; padding:2px 6px;">X</button></td>
        </tr>`).join('');
}

function closeTrade(id) {
    const i = trades.findIndex(t => t.id === id);
    if (i > -1) {
        let currentPnl = parseFloat(document.getElementById(`pnl-${id}`).innerText);
        wallet += currentPnl;
        if (currentType === 'DEMO') demoBalance = wallet; else realBalance = wallet;
        trades.splice(i, 1); 
        updateBalanceUI(); 
        render();
    }
}

// 4. Modal Functions
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
    window.open(`https://wa.me/8403069708?text=Hi, I have paid. Please update my Real Balance.`); 
    closePay(); 
}

// Start Initial View
initChart('BINANCE:BTCUSDT'); 
startStream('BTCUSDT');

