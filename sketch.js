let nodes = [];
let edges = [];
let mode = "node";
let isRunning = false;
let selectedNode = null;
let isPaused = false;
let isDirected = false;
let traveler = {
  x: 0,
  y: 0,
  active: false,
  currentId: null, // Lưu ID đỉnh người đang đứng
};

// Hàm di chuyển mượt giữa 2 đỉnh
async function animateTravel(fromId, toId) {
  let startNode = nodes.find((n) => n.id === fromId);
  let endNode = nodes.find((n) => n.id === toId);
  if (!startNode || !endNode) return;

  traveler.active = true;
  traveler.currentId = null; // Đang bay trên đường nên không đứng ở đỉnh nào cụ thể

  let steps = 30;
  for (let i = 0; i <= steps; i++) {
    let t = i / steps;
    traveler.x = lerp(startNode.x, endNode.x, t);
    traveler.y = lerp(startNode.y, endNode.y, t);
    await new Promise((res) => setTimeout(res, 20));
  }

  traveler.active = false;
  traveler.currentId = toId; // Đã đến đích, đứng yên tại đây
}

function setup() {
  let cnv = createCanvas(windowWidth - 300, windowHeight);
  cnv.parent("canvas-parent");
  textAlign(CENTER, CENTER);
  textSize(16);
}

function windowResized() {
  resizeCanvas(windowWidth - 400, windowHeight);
}

function draw() {
  background(255);
  // Vẽ cạnh
  strokeWeight(2);
  // Trong hàm draw(), tìm đoạn vẽ cạnh:
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i];
    let u = nodes.find((n) => n.id === e.u);
    let v = nodes.find((n) => n.id === e.v);

    if (!u || !v) continue;

    let reverseIdx = edges.findIndex((re) => re.u === e.v && re.v === e.u);
    let isTwoWay = isDirected && reverseIdx !== -1;

    if (isTwoWay) {
      // Luôn so sánh ID để cạnh 1->2 và 2->1 có dir khác nhau
      // Nhưng quan trọng là hàm drawCurveEdge bên dưới phải xử lý dir này
      let dir = e.u < e.v ? 1 : -1;
      drawCurveEdge(u, v, dir);
    } else {
      stroke(180);
      line(u.x, u.y, v.x, v.y);
      if (isDirected) drawArrow(u.x, u.y, v.x, v.y);
    }
  }

  // Vẽ dây khi đang tạo cạnh
  if (mode === "edge" && selectedNode !== null) {
    stroke(52, 152, 219, 150);
    line(selectedNode.x, selectedNode.y, mouseX, mouseY);
  }

  // Vẽ đỉnh
  for (let n of nodes) {
    stroke(44, 62, 80);
    fill(n.color);
    circle(n.x, n.y, 40);

    fill(n.color === "#ffffff" ? 0 : 255);
    noStroke();
    textSize(16);
    textAlign(CENTER, CENTER);
    text(n.id, n.x, n.y);
  }

  // Hiển thị hướng dẫn
  let status = document.getElementById("statusText").innerText;

  if (isRunning && isPaused) {
    let currentStatusText = document.getElementById("statusText").innerText;

    // Kiểm tra dấu hiệu kết thúc hoàn toàn (giống các bước trước)
    let isAlgorithmFinished =
      currentStatusText.includes("Kết quả") ||
      currentStatusText.includes("Tổng") ||
      currentStatusText.includes("Đường đi tìm thấy") ||
      currentStatusText.includes("Không tìm thấy đường đi");

    if (isAlgorithmFinished) {
      push();
      textAlign(CENTER, CENTER);
      textStyle(BOLD);

      // Vẽ nền mờ cho thông báo kết thúc để dễ nhìn
      noStroke();
      fill(0, 0, 0, 150);
      rectMode(CENTER);
      rect(width / 2, 45, 450, 60, 10);

      // Thông báo kết thúc chính
      fill("#f39c12"); // Màu cam
      textSize(26);
      text("🏁 THUẬT TOÁN ĐÃ KẾT THÚC", width / 2, 35);

      // Hướng dẫn nhỏ ở dưới
      textSize(18);
      fill(255);
      text("Nhấn SPACE để chạy thuật toán tiếp", width / 2, 60);
      pop();
    } else {
      push();
      textAlign(CENTER, CENTER);
      fill(231, 76, 60, 180); // Màu đỏ hơi trong suốt
      textSize(30);
      text("⌨ Nhấn SPACE để tiếp tục...", width / 2, 30);
      pop();
    }
  }
  let drawX,
    drawY,
    shouldDraw = false;

  if (traveler.active) {
    // Trường hợp đang di chuyển
    drawX = traveler.x;
    drawY = traveler.y;
    shouldDraw = true;
  } else if (traveler.currentId !== null) {
    // Trường hợp đứng yên tại một đỉnh
    let currentNode = nodes.find((n) => n.id === traveler.currentId);
    if (currentNode) {
      drawX = currentNode.x;
      drawY = currentNode.y;
      shouldDraw = true;
    }
  }

  if (shouldDraw) {
    push();
    textSize(50);
    textAlign(CENTER, CENTER);
    // Vẽ emoji dịch lên trên đỉnh một chút để không che số ID
    text("🏃", drawX, drawY - 25);
    pop();
  }
}

function drawArrow(x1, y1, x2, y2) {
  let angle = atan2(y2 - y1, x2 - x1);

  let arrowSize = 10;

  // lùi vào khỏi node
  let offset = 20;
  let x = x2 - offset * cos(angle);
  let y = y2 - offset * sin(angle);

  push();
  translate(x, y);
  rotate(angle);

  fill(0);
  noStroke();

  triangle(0, 0, -arrowSize, arrowSize / 2, -arrowSize, -arrowSize / 2);

  pop();
}

function drawCurveEdge(u, v, dir) {
  let dx = v.x - u.x;
  let dy = v.y - u.y;
  let len = sqrt(dx * dx + dy * dy);
  if (len === 0) return;

  // TÍNH TOÁN CỐ ĐỊNH:
  // Dù đang vẽ u->v hay v->u, ta luôn lấy vector pháp tuyến của chiều "ID nhỏ -> ID lớn"
  // Điều này đảm bảo hệ trục tọa độ không bị lật 180 độ.

  let nx, ny;
  if (u.id < v.id) {
    nx = -dy / len;
    ny = dx / len;
  } else {
    // Nếu vẽ từ ID lớn về ID nhỏ, ta lấy đối của vector pháp tuyến ngược lại
    // để nó vẫn cùng hướng với thằng ID nhỏ -> ID lớn
    nx = dy / len;
    ny = -dx / len;
  }

  let curveOffset = 60; // Độ cong

  // Bây giờ dir = 1 và dir = -1 sẽ thực sự đẩy cx, cy về 2 phía khác nhau
  let cx = (u.x + v.x) / 2 + nx * curveOffset * dir;
  let cy = (u.y + v.y) / 2 + ny * curveOffset * dir;

  stroke(180);
  noFill();
  beginShape();
  vertex(u.x, u.y);
  quadraticVertex(cx, cy, v.x, v.y);
  endShape();

  drawArrow(cx, cy, v.x, v.y);
}

function hasReverseEdge(u, v) {
  return edges.some((e) => e.u === v && e.v === u);
}

// --- HỆ THỐNG ĐIỀU KHIỂN ---
function addLog(msg, highlight = false) {
  let logBox = document.getElementById("log-box");
  if (!logBox) return;
  let spanClass = highlight ? "class='log-highlight'" : "";
  logBox.innerHTML += `<div class="log-entry"><span ${spanClass}>> ${msg}</span></div>`;
  logBox.scrollTop = logBox.scrollHeight;
}

function updateStatus(m) {
  document.getElementById("statusText").innerText = m;
}

function waitForSpace() {
  isPaused = true;
  return new Promise((res) => {
    const check = () => {
      if (!isPaused) res();
      else requestAnimationFrame(check);
    };
    check();
  });
}

function keyPressed() {
  if (key === " " && isPaused) isPaused = false;
}

// --- THUẬT TOÁN ---

async function startDFS() {
  if (isRunning || nodes.length === 0) return;

  let s = parseInt(document.getElementById("startNode").value);
  if (isNaN(s) || !nodes[s - 1]) return alert("Gốc không hợp lệ");

  isRunning = true;
  resetColors();
  traveler.currentId = s;
  lastPos = s;
  addLog(`-- BẮT ĐẦU DFS TỪ ĐỈNH ${s} --`, true);

  // let visited = new Array(nodes.length + 1).fill(false);
  let chuaxet = new Array(nodes.length + 1).fill(true);
  let stack = [];
  let stackUI = [];
  let dfsOrder = [];

  stack.push(s);
  stackUI.push(s);
  updateStackUI([...stackUI]);
  addLog(`PUSH đỉnh ${s} vào stack`);

  chuaxet[s] = false;
  dfsOrder.push(s);

  nodes[s - 1].color = "#e74c3c";
  traveler.currentId = s;
  updateStatus(`Đang thăm đỉnh ${s}`);
  addLog(`Thăm đỉnh ${s}`);

  await waitForSpace();

  while (stack.length > 0) {
    let u = stack.pop();
    stackUI.pop();
    updateStackUI([...stackUI]);
    addLog(`POP đỉnh ${u} khỏi stack`);

    let neighbors = [...nodes[u - 1].adj].sort((a, b) => a - b);
    let found = false;

    for (let v of neighbors) {
      if (chuaxet[v]) {
        addLog(`Đi từ đỉnh ${u} → ${v}`);

        chuaxet[v] = false;
        dfsOrder.push(v);

        nodes[v - 1].color = "#e74c3c";

        stack.push(u);
        stackUI.push(u);
        addLog(`PUSH đỉnh ${u} vào stack`);

        stack.push(v);
        stackUI.push(v);
        addLog(`PUSH đỉnh ${v} vào stack`);

        updateStackUI([...stackUI]);

        // animation
        await animateTravel(u, v);
        traveler.currentId = v;

        updateStatus(`Đang thăm đỉnh ${v}`);
        addLog(`Thăm đỉnh ${v}`);

        await waitForSpace();

        found = true;
        break;
      }
    }

    if (!found) {
      nodes[u - 1].color = "#2ecc71";
      addLog(`Xong đỉnh ${u}`);

      // 🔥 quay lui
      if (stack.length > 0) {
        let prev = stack[stack.length - 1];

        await animateTravel(u, prev);
        traveler.currentId = prev;

        addLog(`Quay lui từ đỉnh ${u} về ${prev}`);
        updateStatus(`Quay lui từ đỉnh ${u} về ${prev}`);

        await waitForSpace();
      }

      updateStackUI([...stack]);
    }
  }

  addLog(`Kết quả: DFS(${s}) = ${dfsOrder.join(", ")}`, true);
  updateStatus(`Kết quả: DFS(${s}) = ${dfsOrder.join(", ")}`);

  updateStackUI([]);
  await waitForSpace();
  isRunning = false;
}

async function findComponents() {
  if (isRunning || nodes.length === 0) return;

  isRunning = true;
  resetColors();
  addLog("-- TÌM THÀNH PHẦN LIÊN THÔNG --", true);

  let chuaxet = new Array(nodes.length + 1).fill(true);
  let count = 0;
  let colors = ["#9b59b6"];
  let lastPos = null;

  let startIdx = parseInt(document.getElementById("startNode").value);
  if (isNaN(startIdx) || !nodes[startIdx - 1]) startIdx = 1;

  let checkOrder = [startIdx];
  for (let i = 1; i <= nodes.length; i++) {
    if (i !== startIdx) checkOrder.push(i);
  }

  for (let i of checkOrder) {
    if (chuaxet[i]) {
      count++;

      let stack = [];
      let stackUI = [];

      // 🔥 PUSH đỉnh đầu
      stack.push(i);
      stackUI.push(i);
      updateStackUI([...stackUI]);
      addLog(`PUSH đỉnh ${i} vào stack`);

      chuaxet[i] = false;

      traveler.currentId = i;
      updateStatus(`TPLT ${count} bắt đầu từ ${i}`);
      addLog(`-- TPLT ${count} --`, true);

      nodes[i - 1].color = colors[(count - 1) % colors.length];
      addLog(`Đỉnh ${i} ∈ TPLT ${count}`);
      await waitForSpace();

      while (stack.length > 0) {
        let u = stack.pop();
        stackUI.pop();
        updateStackUI([...stackUI]);
        addLog(`POP đỉnh ${u} khỏi stack`);

        let neighbors = [...nodes[u - 1].adj].sort((a, b) => a - b);
        let found = false;

        for (let v of neighbors) {
          if (chuaxet[v]) {
            addLog(`Đi từ đỉnh ${u} → ${v}`);

            // 🔥 đánh dấu ngay khi thăm
            chuaxet[v] = false;

            // 🔥 PUSH lại u rồi PUSH v
            stack.push(u);
            stackUI.push(u);
            addLog(`PUSH đỉnh ${u} vào stack`);

            stack.push(v);
            stackUI.push(v);
            addLog(`PUSH đỉnh ${v} vào stack`);

            updateStackUI([...stackUI]);

            nodes[v - 1].color = colors[(count - 1) % colors.length];

            await animateTravel(u, v);
            traveler.currentId = v;

            addLog(`Đỉnh ${v} ∈ TPLT ${count}`);
            await waitForSpace();

            found = true;
            break;
          }
        }

        if (!found) {
          nodes[u - 1].color = "#2ecc71";
          addLog(`Xong đỉnh ${u}`);

          if (stack.length > 0) {
            let prev = stack[stack.length - 1];

            await animateTravel(u, prev);
            traveler.currentId = prev;

            addLog(`Quay lui từ đỉnh ${u} về ${prev}`);
            await waitForSpace();
          }
        }
      }

      updateStatus(`XONG TPLT ${count}`);
      await waitForSpace();
    }
  }

  updateStatus(`Tổng: ${count} thành phần liên thông`);
  addLog(`Tổng: ${count} thành phần liên thông`, true);

  updateStackUI([]);
  await waitForSpace();
  isRunning = false;
}

async function findPath() {
  if (isRunning || nodes.length === 0) return;

  let s = parseInt(document.getElementById("startNode").value);
  let e = parseInt(document.getElementById("endNode").value);

  if (isNaN(s) || !nodes[s - 1] || isNaN(e) || !nodes[e - 1]) {
    return alert("Đỉnh không hợp lệ");
  }

  isRunning = true;
  resetColors();
  addLog(`-- TÌM ĐƯỜNG ĐI TỪ ĐỈNH ${s} ➔ ${e} --`, true);
  updateStatus(`Đang tìm đường đi từ đỉnh ${s} → ${e}`);

  let chuaxet = new Array(nodes.length + 1).fill(true);
  let parent = new Array(nodes.length + 1).fill(null);

  let stack = [];
  let stackUI = [];

  let lastPos = s;
  let found = false;

  // 🔥 push đỉnh đầu
  stack.push(s);
  stackUI.push(s);
  updateStackUI([...stackUI]);
  addLog(`PUSH đỉnh ${s} vào stack`);

  chuaxet[s] = false;

  nodes[s - 1].color = "#2284e6";
  traveler.currentId = s;
  addLog(`Thăm đỉnh ${s}`);
  await waitForSpace();

  while (stack.length > 0) {
    let u = stack.pop();
    stackUI.pop();
    updateStackUI([...stackUI]);
    addLog(`POP đỉnh ${u} khỏi stack`);

    if (u === e) {
      found = true;
      addLog(`Đã tới đỉnh ${e}`, true);
      break;
    }

    let neighbors = [...nodes[u - 1].adj].sort((a, b) => a - b);
    let goDeeper = false;

    for (let v of neighbors) {
      if (chuaxet[v]) {
        addLog(`Đi từ đỉnh ${u} → ${v}`);

        chuaxet[v] = false;
        parent[v] = u;

        // 🔥 push lại u rồi push v
        stack.push(u);
        stackUI.push(u);
        addLog(`PUSH đỉnh ${u} vào stack`);

        stack.push(v);
        stackUI.push(v);
        addLog(`PUSH đỉnh ${v} vào stack`);

        updateStackUI([...stackUI]);

        await animateTravel(lastPos, v);
        lastPos = v;

        nodes[v - 1].color = "#2284e6";
        addLog(`Thăm đỉnh ${v}`);
        await waitForSpace();

        goDeeper = true;
        break;
      }
    }

    // 🔥 nếu không đi sâu được → quay lui
    if (!goDeeper) {
      nodes[u - 1].color = "#2ecc71";
      addLog(`Xong đỉnh ${u}`);

      if (stack.length > 0) {
        let prev = stack[stack.length - 1];

        await animateTravel(lastPos, prev);
        lastPos = prev;

        addLog(`Quay lui từ đỉnh ${u} về ${prev}`);
        await waitForSpace();
      }
    }
  }

  // 🔥 truy vết đường đi
  if (found) {
    let path = [];
    let cur = e;

    while (cur !== null) {
      path.push(cur);
      cur = parent[cur];
    }

    path.reverse();

    for (let x of path) {
      nodes[x - 1].color = "#12f3e8";
    }

    addLog(`Đường đi tìm thấy: ${path.join(" ➔ ")}`, true);
    updateStatus(`Đường đi tìm thấy: ${path.join(" → ")}`);
  } else {
    addLog(`Không tìm thấy đường đi từ đỉnh ${s} ➔ ${e}`, true);
    updateStatus(`Không tìm thấy đường đi`);
  }

  updateStackUI([]);
  await waitForSpace();
  isRunning = false;
}

// --- QUẢN LÝ ĐỒ THỊ ---
function mousePressed() {
  if (isRunning || mouseX < 0 || mouseX > width) return;

  // CHỨC NĂNG XÓA (CLICK CHUỘT PHẢI)
  if (mouseButton === RIGHT) {
    // 1. Kiểm tra xóa Đỉnh
    let nodeIdx = nodes.findIndex((n) => dist(mouseX, mouseY, n.x, n.y) < 25);
    if (nodeIdx !== -1) {
      let id = nodes[nodeIdx].id;
      if (confirm(`Bạn có chắc muốn xóa ĐỈNH ${id} và các cạnh liên quan ?`)) {
        edges = edges.filter((e) => e.u !== id && e.v !== id);
        nodes.splice(nodeIdx, 1);
        rebuildGraph();
        updateStatus(`Đã xóa đỉnh ${id}`);
        addLog(`Đã xóa đỉnh ${id}`, true);
      }
      return false;
    }

    // 2. Kiểm tra xóa Cạnh (Hỗ trợ cạnh cong 2 chiều)
    for (let i = edges.length - 1; i >= 0; i--) {
      let e = edges[i];
      let u = nodes.find((n) => n.id === e.u);
      let v = nodes.find((n) => n.id === e.v);

      if (u && v) {
        let reverseIdx = edges.findIndex((re) => re.u === e.v && re.v === e.u);
        let isTwoWay = isDirected && reverseIdx !== -1;

        if (isTwoWay) {
          let dir = e.u < e.v ? 1 : -1;
          let dx = v.x - u.x;
          let dy = v.y - u.y;
          let len = sqrt(dx * dx + dy * dy);

          // Logic vector pháp tuyến cố định đã sửa ở bước trước
          let nx = u.id < v.id ? -dy / len : dy / len;
          let ny = u.id < v.id ? dx / len : -dx / len;

          let curveOffset = 60;
          let cx = (u.x + v.x) / 2 + nx * curveOffset * dir;
          let cy = (u.y + v.y) / 2 + ny * curveOffset * dir;

          // KIỂM TRA VA CHẠM TOÀN BỘ ĐƯỜNG CONG
          let d = distToBezier(mouseX, mouseY, u.x, u.y, cx, cy, v.x, v.y);

          if (d < 15) {
            // Click vào bất cứ đâu trên sợi dây trong khoảng 15px
            if (confirm(`Xóa cạnh ${e.u} -> ${e.v}?`)) {
              edges.splice(i, 1);
              rebuildGraph();
              return false;
            }
          }
        } else {
          // Cạnh thẳng bình thường
          d = distToSegment(mouseX, mouseY, u.x, u.y, v.x, v.y);
          if (d < 15) {
            if (confirm(`Bạn có chắc muốn xóa cạnh giữa ${e.u} và ${e.v}?`)) {
              edges.splice(i, 1);
              rebuildGraph();
              return false;
            }
          }
        }
      }
    }
    return false;
  }

  // CHỨC NĂNG (CLICK CHUỘT TRÁI)
  if (mouseButton === LEFT) {
    if (mode === "node") {
      let newNodeId = nodes.length + 1;
      nodes.push({
        id: newNodeId,
        x: mouseX,
        y: mouseY,
        color: "#ffffff",
        adj: [],
      });
      updateStatus(`Đã thêm đỉnh mới: ${newNodeId}`);
    } else {
      let clicked = nodes.find((n) => dist(mouseX, mouseY, n.x, n.y) < 25);
      if (clicked) {
        if (!selectedNode) {
          selectedNode = clicked;
          clicked.color = "#f1c40f";
          updateStatus(
            `Đã chọn đỉnh ${clicked.id}. Chọn đỉnh tiếp theo để nối cạnh.`,
          );
        } else {
          if (selectedNode.id !== clicked.id) {
            let exists;
            if (isDirected) {
              // 🔥 chỉ check đúng chiều
              exists = edges.find(
                (e) => e.u === selectedNode.id && e.v === clicked.id,
              );
            } else {
              // 🔥 vô hướng → check cả 2 chiều
              exists = edges.find(
                (e) =>
                  (e.u === selectedNode.id && e.v === clicked.id) ||
                  (e.v === selectedNode.id && e.u === clicked.id),
              );
            }
            if (!exists) {
              edges.push({ u: selectedNode.id, v: clicked.id });
              rebuildGraph();
              if (isDirected) {
                updateStatus(`Đã nối cạnh ${selectedNode.id} → ${clicked.id}`);
              } else {
                updateStatus(
                  `Đã nối cạnh giữa đỉnh ${selectedNode.id} và ${clicked.id}`,
                );
              }
            } else {
              if (isDirected) {
                updateStatus(
                  `Đã tồn tại cạnh ${selectedNode.id} → ${clicked.id}`,
                );
              } else {
                updateStatus(
                  `Đã tồn tại cạnh giữa đỉnh ${selectedNode.id} và ${clicked.id}`,
                );
              }
            }
          }
          selectedNode.color = "#ffffff";
          selectedNode = null;
        }
      }
    }
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  let l2 = dx * dx + dy * dy;
  if (l2 === 0) return dist(px, py, x1, y1);

  // Hình chiếu của điểm lên đoạn thẳng
  let t = ((px - x1) * dx + (py - py) * dy) / l2; // Lỗi cũ có thể ở px - x1
  // Sửa lại chuẩn:
  let t_fixed = ((px - x1) * dx + (py - y1) * dy) / l2;
  t_fixed = Math.max(0, Math.min(1, t_fixed));

  return dist(px, py, x1 + t_fixed * dx, y1 + t_fixed * dy);
}

function distToBezier(px, py, x1, y1, cx, cy, x2, y2) {
  let minDist = Infinity;
  let steps = 10; // Chia đường cong làm 10 đoạn để kiểm tra

  let prevX = x1;
  let prevY = y1;

  for (let i = 1; i <= steps; i++) {
    let t = i / steps;
    // Công thức Bezier bậc 2
    let x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
    let y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

    // Tính khoảng cách từ chuột đến đoạn thẳng nhỏ (prev -> hiện tại)
    let d = distToSegment(px, py, prevX, prevY, x, y);
    if (d < minDist) minDist = d;

    prevX = x;
    prevY = y;
  }
  return minDist;
}

function updateStackUI(s) {
  let container = document.getElementById("stack-visual");
  if (s.length === 0) {
    container.innerHTML = ""; // Xóa sạch giao diện nếu stack rỗng
    return;
  }
  container.innerHTML = s
    .map((id) => `<div class="stack-item">Đỉnh ${id}</div>`)
    .join("");
}

function setMode(m) {
  mode = m;
  document.getElementById("nodeBtn").className = m === "node" ? "active" : "";
  document.getElementById("edgeBtn").className = m === "edge" ? "active" : "";
}

function resetColors() {
  nodes.forEach((n) => (n.color = "#ffffff"));
}

function changeGraphType() {
  let type = document.getElementById("graphType").value;
  isDirected = type === "directed";

  rebuildGraph();

  addLog(`Đã chuyển sang đồ thị ${isDirected ? "có hướng" : "vô hướng"}`, true);
}

function resetGraph() {
  if (isRunning) return;
  if (confirm("Bạn có chắc chắn muốn xóa toàn bộ đồ thị không?")) {
    nodes = [];
    edges = [];
    isRunning = false;
    isPaused = false;
    selectedNode = null;
    updateStatus("Sẵn sàng.");
    updateStackUI([]);
    if (traveler) traveler.currentId = null;
    let logBox = document.getElementById("log-box");
    if (logBox) logBox.innerHTML = "";
  }
}

function rebuildGraph() {
  // BƯỚC 1: Đánh lại ID từ 1
  nodes.forEach((n, index) => {
    let oldId = n.id;

    // đổi sang ID tạm (âm)
    edges.forEach((e) => {
      if (e.u === oldId) e.u = -100 - index;
      if (e.v === oldId) e.v = -100 - index;
    });

    n.id = index + 1; // ✅ bắt đầu từ 1
  });

  // chuyển ID tạm về ID mới
  edges.forEach((e) => {
    if (e.u <= -100) e.u = Math.abs(e.u) - 100 + 1;
    if (e.v <= -100) e.v = Math.abs(e.v) - 100 + 1;
  });

  // BƯỚC 2: build adjacency list (index 1-based)
  nodes.forEach((n) => (n.adj = []));

  edges.forEach((e) => {
    if (nodes[e.u - 1] && nodes[e.v - 1]) {
      nodes[e.u - 1].adj.push(e.v);

      if (!isDirected) {
        nodes[e.v - 1].adj.push(e.u);
      }
    }
  });
}

// Chặn menu chuột phải của trình duyệt trên toàn bộ trang web
document.oncontextmenu = function () {
  return false;
};
