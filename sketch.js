let nodes = [];
let edges = [];
let mode = "node";
let isRunning = false;
let selectedNode = null;
let isPaused = false;

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
  for (let e of edges) {
    if (nodes[e.u - 1] && nodes[e.v - 1]) {
      stroke(180);
      line(
        nodes[e.u - 1].x,
        nodes[e.u - 1].y,
        nodes[e.v - 1].x,
        nodes[e.v - 1].y,
      );
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
    textAlign(CENTER, CENTER);
    text(n.id, n.x, n.y);
  }

  // Hiển thị hướng dẫn
  let status = document.getElementById("statusText").innerText;

  if (isRunning && isPaused) {
    fill(status.includes("XONG") ? "#f39c12" : "#e74c3c");
    textSize(20);

    let msg = status.includes("XONG")
      ? "BƯỚC NÀY XONG - NHẤN SPACE"
      : "NHẤN SPACE ĐỂ TIẾP TỤC";

    text(msg, width / 2, 40);
  }
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
  addLog(`--- BẮT ĐẦU DFS TỪ ĐỈNH ${s} ---`, true);

  let visited = new Array(nodes.length + 1).fill(false);
  let stackUI = [];
  let dfsOrder = [];

  async function dfs(u) {
    // 🔥 PUSH (vào stack)
    stackUI.push(u);
    updateStackUI(stackUI);
    addLog(`Push đỉnh ${u} vào stack`);

    visited[u] = true;
    dfsOrder.push(u);

    nodes[u - 1].color = "#e74c3c";
    updateStatus(`Đang thăm đỉnh ${u}`);
    addLog(`Thăm ${u}`);

    await waitForSpace();

    let neighbors = [...nodes[u - 1].adj].sort((a, b) => a - b);

    for (let v of neighbors) {
      if (!visited[v]) {
        addLog(`${u} → ${v}`);
        await dfs(v);

        updateStatus(`Quay lui về đỉnh ${u}`);
        nodes[u - 1].color = "#e74c3c";
        await waitForSpace();
      }
    }

    nodes[u - 1].color = "#2ecc71";
    addLog(`XONG ${u}`);

    // 🔥 POP (ra khỏi stack)
    stackUI.pop();
    updateStackUI(stackUI);
    addLog(`Pop đỉnh ${u} khỏi stack`);
  }

  await dfs(s);

  addLog(`Kết quả: DFS(${s}) = ${dfsOrder.join(", ")}`, true);

  updateStackUI([]);
  updateStatus(`Kết quả: DFS(${s}) = ${dfsOrder.join(", ")}`);

  await waitForSpace();
  isRunning = false;
}

async function findComponents() {
  if (isRunning || nodes.length === 0) return;

  isRunning = true;
  resetColors();
  addLog("--- TÌM THÀNH PHẦN LIÊN THÔNG ---", true);

  let visited = new Array(nodes.length + 1).fill(false);
  let count = 0;
  let colors = ["#1abc9c", "#9b59b6", "#f1c40f", "#e67e22", "#34495e"];

  let startIdx = parseInt(document.getElementById("startNode").value);
  if (isNaN(startIdx) || !nodes[startIdx - 1]) startIdx = 1;

  // thứ tự duyệt (ưu tiên start)
  let checkOrder = [startIdx];
  for (let i = 1; i <= nodes.length; i++) {
    if (i !== startIdx) checkOrder.push(i);
  }

  for (let i of checkOrder) {
    if (!visited[i]) {
      count++;
      let stack = [i];

      updateStatus(`TPLT ${count} bắt đầu từ ${i}`);
      addLog(`--- TPLT ${count} ---`, true);

      while (stack.length > 0) {
        let u = stack.pop();

        if (visited[u]) continue;

        visited[u] = true;
        nodes[u - 1].color = colors[(count - 1) % colors.length];

        addLog(`Đỉnh ${u} ∈ TPLT ${count}`);
        await waitForSpace();

        // ưu tiên đỉnh nhỏ hơn
        let neighbors = [...nodes[u - 1].adj].sort((a, b) => b - a);
        for (let v of neighbors) {
          if (!visited[v]) {
            stack.push(v);
          }
        }
      }

      updateStatus(`XONG TPLT ${count}`);
      await waitForSpace();
    }
  }

  updateStatus(`Tổng: ${count} thành phần liên thông`);
  addLog(`Tổng: ${count} thành phần liên thông`, true);

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
  addLog(`--- TÌM ĐƯỜNG ĐI TỪ ĐỈNH ${s} ➔ ${e} ---`, true);
  updateStatus(`Đang tìm đường đi từ đỉnh ${s} → ${e}`);

  let visited = new Array(nodes.length + 1).fill(false);
  let parent = new Array(nodes.length + 1).fill(null);

  let stack = [s];
  let found = false;

  while (stack.length > 0) {
    let u = stack.pop();

    if (visited[u]) continue;

    visited[u] = true;
    nodes[u - 1].color = "#e74c3c";

    addLog(`Thăm ${u}`);
    await waitForSpace();

    if (u === e) {
      found = true;
      addLog(`ĐÃ TỚI ĐỈNH ${e}`, true);
      break;
    }

    // ưu tiên nhỏ hơn
    let neighbors = [...nodes[u - 1].adj].sort((a, b) => b - a);

    for (let v of neighbors) {
      if (!visited[v]) {
        parent[v] = u;
        stack.push(v);
      }
    }
  }

  if (found) {
    let path = [];
    let cur = e;

    while (cur !== null) {
      path.push(cur);
      cur = parent[cur];
    }

    path.reverse();

    // tô màu đường đi
    for (let x of path) {
      nodes[x - 1].color = "#f1c40f";
    }

    addLog(`Đường đi tìm thấy: ${path.join(" ➔ ")}`, true);
    updateStatus(`Đường đi tìm thấy: ${path.join(" → ")}`);
  } else {
    addLog("KHÔNG CÓ ĐƯỜNG ĐI", true);
    updateStatus("KHÔNG TÌM THẤY ĐƯỜNG ĐI");
  }

  await waitForSpace();
  isRunning = false;
}

// --- QUẢN LÝ ĐỒ THỊ ---
function mousePressed() {
  if (isRunning || mouseX < 0 || mouseX > width) return;

  // CHỨC NĂNG XÓA (CLICK CHUỘT PHẢI)
  if (mouseButton === RIGHT) {
    // 1. Kiểm tra xóa Đỉnh trước
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

    // 2. Nếu không trúng đỉnh, quét danh sách Cạnh
    for (let i = edges.length - 1; i >= 0; i--) {
      let e = edges[i];
      let nU = nodes.find((n) => n.id === e.u);
      let nV = nodes.find((n) => n.id === e.v);

      if (nU && nV) {
        // GỌI HÀM distToSegment VỪA THÊM Ở TRÊN
        let d = distToSegment(mouseX, mouseY, nU.x, nU.y, nV.x, nV.y);
        if (d < 15) {
          if (confirm(`Bạn có chắc muốn xóa CẠNH ${e.u} - ${e.v}?`)) {
            edges.splice(i, 1);
            rebuildGraph();
            updateStatus(`Đã xóa cạnh ${e.u} - ${e.v}`);
            addLog(`Đã xóa cạnh ${e.u} - ${e.v}`, true);
          }
          return false;
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
            let exists = edges.find(
              (e) =>
                (e.u === selectedNode.id && e.v === clicked.id) ||
                (e.v === selectedNode.id && e.u === clicked.id),
            );
            if (!exists) {
              edges.push({ u: selectedNode.id, v: clicked.id });
              // Tự động rebuild để cập nhật adj list cho chắc chắn
              rebuildGraph();
              updateStatus(
                `Đã nối cạnh giữa đỉnh ${selectedNode.id} và ${clicked.id}`,
              );
            } else {
              updateStatus(`Cạnh này đã tồn tại rồi!`);
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

function resetGraph() {
  if (isRunning) return;
  nodes = [];
  edges = [];
  isRunning = false;
  isPaused = false;
  updateStatus("Sẵn sàng.");
  updateStackUI([]);
  document.getElementById("log-box").innerHTML = "";
  if (confirm("Bạn có chắc chắn muốn xóa toàn bộ đồ thị không?")) {
    nodes = [];
    edges = [];
    isRunning = false;
    isPaused = false;
    selectedNode = null;
    updateStatus("Sẵn sàng.");
    updateStackUI([]);
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
      nodes[e.v - 1].adj.push(e.u);
    }
  });
}

// Chặn menu chuột phải của trình duyệt trên toàn bộ trang web
document.oncontextmenu = function () {
  return false;
};
