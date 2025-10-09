const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const modal = document.getElementById("questionModal");
const questionContainer = document.getElementById("questionContainer");
const categoryTitle = document.getElementById("categoryTitle");

const categories = Object.keys(questions);
const arc = (2 * Math.PI) / categories.length;
let rotation = 0;
let spinning = false;

// Draw wheel
function drawWheel() {
  categories.forEach((cat, i) => {
    const angle = i * arc;
    ctx.beginPath();
    ctx.fillStyle = i % 2 === 0 ? "#2563eb" : "#1e40af";
    ctx.moveTo(200, 200);
    ctx.arc(200, 200, 200, angle, angle + arc);
    ctx.fill();
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.font = "bold 16px Segoe UI";
    ctx.fillText(cat, 180, 10);
    ctx.restore();
  });
}
drawWheel();

// Spin logic
spinBtn.addEventListener("click", () => {
  if (spinning) return;
  spinning = true;
  const spins = Math.floor(Math.random() * 5) + 5;
  const randomAngle = Math.random() * 2 * Math.PI;
  const totalRotation = spins * 2 * Math.PI + randomAngle;

  const duration = 4000;
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    rotation = easeOut * totalRotation;
    ctx.clearRect(0, 0, 400, 400);
    ctx.save();
    ctx.translate(200, 200);
    ctx.rotate(rotation);
    ctx.translate(-200, -200);
    drawWheel();
    ctx.restore();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      const selectedIndex = Math.floor(((2 * Math.PI - (rotation % (2 * Math.PI))) / arc)) % categories.length;
      const selectedCategory = categories[selectedIndex];
      showQuestions(selectedCategory);
    }
  }

  requestAnimationFrame(animate);
});

// Show questions
function showQuestions(category) {
  modal.classList.remove("hidden");
  categoryTitle.textContent = category;
  questionContainer.innerHTML = "";

  const questionSet = questions[category];
  const randomThree = questionSet.sort(() => 0.5 - Math.random()).slice(0, 3);
  let correctCount = 0;

  randomThree.forEach((q) => {
    const qDiv = document.createElement("div");
    qDiv.innerHTML = `<p><strong>${q.question}</strong></p>`;
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = opt;
      btn.onclick = () => {
        if (opt === q.answer) {
          btn.style.background = "#22c55e";
          correctCount++;
        } else {
          btn.style.background = "#ef4444";
        }
        [...qDiv.querySelectorAll("button")].forEach(b => b.disabled = true);
        if (correctCount === randomThree.length) {
          const result = document.createElement("p");
          result.className = "result";
          result.textContent = "🎉 Good job! You can claim your prize!";
          questionContainer.appendChild(result);
          setTimeout(() => location.reload(), 20000);
        }
      };
      qDiv.appendChild(btn);
    });
    questionContainer.appendChild(qDiv);
  });
}
