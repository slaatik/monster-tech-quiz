/* -------------------------
  Phishing Awareness Wheel
  Uses questions.js (must be present)
----------------------------*/

/* -------------------------
  Embedded badge image (small optimized JPEG)
  If you later add a full-res badge to /assets/badge.png
  change BADGE_DATA_URL to '/assets/badge.png'
----------------------------*/
const BADGE_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wCEAAkGBxAQEBAQEBAPEA8QEBAVEBAPDw8PDw8PFREWFhURExUYHSggGBolGxMTITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGi0mHyU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NP/AABEIAOEA4QMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAABAgME/8QAHhAAAgIDAQEBAAAAAAAAAAAAAQIDBAAFBhESMXH/xAAVAQEBAAAAAAAAAAAAAAAAAAABAv/EABoRAAICAwAAAAAAAAAAAAAAAAABAhESITH/2gAMAwEAAhEDEQA/AJ2qK5uFZs1gGq7q4zKkOqS5wqgJ4k9yK2eJ/3q1sZV1g3b6Q7d5q6S1n+0R0bC1bPL0g4qY6C1XG6rK1lYuY5v/2Q==";

/* -------------------------
   Basic DOM
-------------------------*/
const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const pointer = document.getElementById("pointer");
const modal = document.getElementById("questionModal");
const questionContainer = document.getElementById("questionContainer");
const categoryTitle = document.getElementById("categoryTitle");
const modalMessage = document.getElementById("modalMessage");
const retryBtn = document.getElementById("retryBtn");
const closeBtn = document.getElementById("closeBtn");
const retriesLeftEl = document.getElementById("retriesLeft");
const retryInfo = document.getElementById("retryInfo");

const badgeModal = document.getElementById("badgeModal");
const badgeImg = document.getElementById("badgeImg");
const claimBtn = document.getElementById("claimBtn");

/* -------------------------
   Variables & categories
-------------------------*/
const categories = Object.keys(questions || {});
const arc = (2 * Math.PI) / categories.length;
const cx = canvas.width / 2, cy = canvas.height / 2, radius = Math.min(cx, cy) - 4;
let rotation = 0;
let spinning = false;

/* Retry system: players get one retry by default */
let retriesLeft = 1;
retriesLeftEl.textContent = retriesLeft;

/* -------------------------
   Draw wheel
-------------------------*/
function drawWheel() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  categories.forEach((cat, i) => {
    const start = i * arc;
    const end = start + arc;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? "#2563eb" : "#1e40af";
    ctx.fill();

    // category text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2 + rotation);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px Segoe UI, Arial";
    ctx.textAlign = "right";
    ctx.fillText(cat, radius - 12, 6);
    ctx.restore();
  });

  // center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, 2 * Math.PI);
  ctx.fillStyle = "#07142a";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#083a66";
  ctx.stroke();
}
drawWheel();

/* -------------------------
  AUDIO: WebAudio synthesized sounds (no external files)
-------------------------*/
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function rampGain(g, start, end, time) {
  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(start, now);
  g.gain.linearRampToValueAtTime(end, now + time);
}

/* wheel hum (looping) */
let spinOsc, spinGain;
function startSpinSound() {
  stopSpinSound();
  spinOsc = audioCtx.createOscillator();
  spinGain = audioCtx.createGain();
  spinOsc.type = "sawtooth";
  spinOsc.frequency.value = 120;
  spinGain.gain.value = 0;
  spinOsc.connect(spinGain);
  spinGain.connect(audioCtx.destination);
  spinOsc.start();
  rampGain(spinGain, 0, 0.06, 0.12);
}
function stopSpinSound() {
  if (spinGain) rampGain(spinGain, spinGain.gain.value, 0, 0.25);
  if (spinOsc) {
    setTimeout(()=>{ try{spinOsc.stop()}catch(e){} }, 300);
  }
}

/* win chime (pleasant arpeggio) */
function playWinChime(){
  const now = audioCtx.currentTime;
  const freqs = [880, 1100, 1320];
  freqs.forEach((f,i)=>{
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = f;
    g.gain.value = 0;
    o.connect(g);
    g.connect(audioCtx.destination);
    const start = now + i*0.12;
    o.start(start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.10, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
    o.stop(start + 0.8);
  });
}

/* lose buzzer */
function playLoseBuzzer(){
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "square";
  o.frequency.value = 220;
  g.gain.value = 0;
  o.connect(g); g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  o.start(now);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.15, now + 0.02);
  o.frequency.exponentialRampToValueAtTime(60, now + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  o.stop(now + 0.75);
}

/* -------------------------
  Spin logic
-------------------------*/
spinBtn.addEventListener("click", async () => {
  if (spinning) return;
  // resume audio context if required by browser interaction policy
  if (audioCtx.state === "suspended") await audioCtx.resume();

  spinning = true;
  pointer.classList.add("spin-wobble");
  startSpinSound();

  // pick a random angle
  const extraSpins = 5 + Math.floor(Math.random()*4); // 5-8 full spins
  const randomAngle = Math.random() * 2 * Math.PI;
  const totalRotation = extraSpins * 2 * Math.PI + randomAngle;

  const duration = 4200;
  const start = performance.now();
  function animate(now){
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOut cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    rotation = ease * totalRotation;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
    drawWheel();
    ctx.restore();

    if (progress < 1) requestAnimationFrame(animate);
    else {
      stopSpinSound();
      pointer.classList.remove("spin-wobble");
      spinning = false;
      // compute selected index: pointer is at top (angle = -rotation mod 2pi)
      const finalAngle = (2 * Math.PI - (rotation % (2 * Math.PI))) % (2 * Math.PI);
      const selectedIndex = Math.floor(finalAngle / arc) % categories.length;
      const selectedCategory = categories[selectedIndex];
      showQuestions(selectedCategory);
    }
  }
  requestAnimationFrame(animate);
});

/* -------------------------
  Question display & answer logic
-------------------------*/
function showQuestions(category){
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  categoryTitle.textContent = category;
  questionContainer.innerHTML = "";
  modalMessage.textContent = "";
  retryBtn.classList.add("hidden");
  closeBtn.classList.add("hidden");

  const pool = questions[category] || [];
  // copy then shuffle
  const randomThree = pool.slice().sort(()=>0.5 - Math.random()).slice(0,3);
  let correctCount = 0;
  let totalAnswered = 0;

  randomThree.forEach((q, idx) => {
    const block = document.createElement("div");
    block.innerHTML = `<p><strong>Q${idx+1}:</strong> ${q.question}</p>`;
    // create option buttons
    const opts = q.options.slice().sort(()=>0.5 - Math.random());
    opts.forEach(opt => {
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = opt;
      b.onclick = () => {
        totalAnswered++;
        if (opt === q.answer) {
          b.style.background = "linear-gradient(0deg,#16a34a,#22c55e)";
          playTinyCorrect();
          correctCount++;
        } else {
          b.style.background = "linear-gradient(0deg,#dc2626,#ef4444)";
          playTinyWrong();
        }
        // disable block's buttons
        block.querySelectorAll("button").forEach(btn=>btn.disabled=true);
        // check end
        if (totalAnswered >= randomThree.length) {
          setTimeout(()=>finishRound(correctCount, randomThree.length), 200);
        }
      };
      block.appendChild(b);
    });
    questionContainer.appendChild(block);
  });
}

function playTinyCorrect(){
  // single ping
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type="sine"; o.frequency.value = 880;
  g.gain.value = 0;
  o.connect(g); g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  o.start(now);
  g.gain.linearRampToValueAtTime(0.12, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  o.stop(now + 0.5);
}
function playTinyWrong(){
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type="triangle"; o.frequency.value = 220;
  o.connect(g); g.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  o.start(now);
  g.gain.linearRampToValueAtTime(0.12, now + 0.01);
  o.frequency.exponentialRampToValueAtTime(110, now + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  o.stop(now + 0.6);
}

/* finishRound: check win/lose */
function finishRound(correctCount, needed){
  if (correctCount === needed) {
    // WIN
    modalMessage.style.color = "#22c55e";
    modalMessage.textContent = "🎉 All correct! You win!";
    playWinChime();
    // show badge modal after short delay
    setTimeout(()=>showBadgeAndPrize(), 600);
    // auto-refresh to wheel after 20 seconds
    setTimeout(()=> location.reload(), 20000);
  } else {
    // LOST
    playLoseBuzzer();
    if (retriesLeft > 0) {
      modalMessage.style.color = "#f59e0b";
      modalMessage.textContent = `Not all correct. You have 1 retry available — try again!`;
      retryBtn.classList.remove("hidden");
      retryBtn.onclick = () => {
        retriesLeft--;
        retriesLeftEl.textContent = retriesLeft;
        retryBtn.classList.add("hidden");
        modalMessage.textContent = "";
        modal.querySelectorAll("button.option").forEach(b=>{ b.disabled=false; b.style.background=""; });
        // re-generate same modal? we'll simply hide and let them spin again
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden","true");
      };
    } else {
      modalMessage.style.color = "#ef4444";
      modalMessage.textContent = "Sorry, game over.";
      closeBtn.classList.remove("hidden");
      // after final loss, reload back to wheel after 20s
      setTimeout(()=> location.reload(), 20000);
    }
  }
}

/* close modal */
closeBtn.addEventListener("click", ()=> {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
});

/* -------------------------
   Badge flow
-------------------------*/
function showBadgeAndPrize(){
  // set badge image (embedded small preview);
  badgeImg.src = BADGE_DATA_URL;
  badgeModal.classList.remove("hidden");
  // clicking claim... you may link to a prize page or show code to claim
  claimBtn.onclick = () => {
    // Example: display a claim code and copy it to clipboard
    const claimCode = `SPC-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    claimBtn.textContent = `Code: ${claimCode} • Copy`;
    navigator.clipboard?.writeText(claimCode).catch(()=>{});
    // disable to avoid repeated clicks
    claimBtn.disabled = true;
    // optional: hide badge modal after a short time and reload
    setTimeout(()=> location.reload(), 8000);
  };
}

/* -------------------------
   small UI: show retries
-------------------------*/
function updateRetryUI(){
  retriesLeftEl.textContent = retriesLeft;
  if (retriesLeft <= 0) retryInfo.classList.add("hidden");
  else retryInfo.classList.remove("hidden");
}
updateRetryUI();

/* -------------------------
  Render loop to keep wheel text upright when not spinning
  (we already draw on demand)
-------------------------*/
drawWheel();

/* -------------------------
  NOTES & Tips:
  - The badge image is a small embedded preview (optimized). To use a full-res badge,
    add your image at /assets/badge.png and set BADGE_DATA_URL = '/assets/badge.png'
  - You can customize questions.js to add or update categories and questions.
  - To host: push these files to a GitHub repo and enable GitHub Pages (main branch).
-------------------------*/
