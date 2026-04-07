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

  // Vẽ các cạnh
  strokeWeight(2);
  for (let e of edges) {
    stroke(180);
    line(nodes[e.u].x, nodes[e.u].y, nodes[e.v].x, nodes[e.v].y);
  }

  // Vẽ dây nối tạm thời khi thêm cạnh
  if (mode === "edge" && selectedNode !== null) {
    stroke(52, 152, 219, 150);
    line(selectedNode.x, selectedNode.y, mouseX, mouseY);
  }

  // Vẽ các đỉnh
  for (let n of nodes) {
    stroke(44, 62, 80);
    fill(n.color);
    circle(n.x, n.y, 40);
    fill(n.color === "#ffffff" ? 0 : 255);
    noStroke();
    text(n.id, n.x, n.y);
  }

  // LOGIC HIỂN THỊ THÔNG BÁO TRÊN CANVAS
  let status = document.getElementById("statusText").innerText;
  if (isRunning) {
    if (isPaused) {
      fill(status.includes("XONG") ? "#f39c12" : "#e74c3c");
      textSize(22);
      let msg =
        status.includes("XONG") || status.includes("THẤY")
          ? "BƯỚC NÀY XONG. NHẤN 'SPACE' ĐỂ TIẾP TỤC"
          : "ẤN PHÍM 'SPACE' ĐỂ CHẠY BƯỚC TIẾP THEO";
      text(msg, width / 2, 50);
    }
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
  if (isNaN(s) || !nodes[s]) return alert("Gốc không hợp lệ");

  isRunning = true;
  resetColors();
  addLog(`--- BẮT ĐẦU DFS TỪ ĐỈNH ${s} ---`, true);

  let visited = new Array(nodes.length).fill(false);
  let stack = [s];

  while (stack.length > 0) {
    let u = stack.pop();
    updateStackUI(stack);

    if (visited[u]) continue; // bỏ nếu đã thăm

    visited[u] = true;
    nodes[u].color = "#e74c3c"; // đang xét
    updateStatus(`Đang thăm đỉnh ${u}`);
    addLog(`Pop ${u} khỏi Stack`);

    await waitForSpace();

    // DFS chuẩn: chỉ cần check visited
    for (let v of [...nodes[u].adj].reverse()) {
      if (!visited[v]) {
        stack.push(v);
        updateStackUI(stack);
        addLog(`Push ${v} vào Stack (kề của ${u})`);
      }
    }

    nodes[u].color = "#2ecc71"; // đã xong
    updateStatus(`XONG đỉnh ${u}`);
    await waitForSpace();
  }

  updateStackUI([]);
  updateStatus("KẾT THÚC: DFS hoàn tất.");
  addLog("--- DFS KẾT THÚC ---", true);

  await waitForSpace();
  isRunning = false;
}

async function findComponents() {
  if (isRunning || nodes.length === 0) return;
  isRunning = true;
  resetColors();
  addLog("--- TÌM THÀNH PHẦN LIÊN THÔNG ---", true);

  let visited = new Array(nodes.length).fill(false);
  let count = 0;
  let colors = ["#1abc9c", "#9b59b6", "#f1c40f", "#e67e22", "#34495e"];

  // --- PHẦN SỬA LỖI GỐC 0 Ở ĐÂY ---
  let startIdx = parseInt(document.getElementById("startNode").value);
  if (isNaN(startIdx) || !nodes[startIdx]) startIdx = 0; // Nếu nhập sai thì mặc định về 0

  // Tạo một danh sách các đỉnh cần kiểm tra, đưa đỉnh Gốc lên đầu tiên
  let checkOrder = [];
  checkOrder.push(startIdx); // Ưu tiên đỉnh gốc trước
  for (let i = 0; i < nodes.length; i++) {
    if (i !== startIdx) checkOrder.push(i); // Sau đó mới thêm các đỉnh còn lại vào hàng đợi
  }
  // --------------------------------

  for (let i of checkOrder) {
    // Duyệt theo thứ tự ưu tiên mới
    if (!visited[i]) {
      count++;
      let stack = [i];
      updateStatus(`Tìm thấy vùng ${count}. Đang duyệt từ đỉnh ${i}...`);
      addLog(`Vùng ${count} khởi tạo từ đỉnh ${i}`, true);

      while (stack.length > 0) {
        let u = stack.pop();
        if (!visited[u]) {
          visited[u] = true;
          nodes[u].color = colors[count % 5];
          addLog(`Đỉnh ${u} ∈ Vùng ${count}`);
          await waitForSpace();
          for (let v of nodes[u].adj) if (!visited[v]) stack.push(v);
        }
      }
      updateStatus(`XONG vùng ${count}. Nhấn Space để tìm tiếp.`);
      await waitForSpace();
    }
  }

  updateStatus("KẾT THÚC: Tìm vùng liên thông hoàn tất.");
  addLog(`--- TÌM THẤY ${count} THÀNH PHẦN LIÊN THÔNG ---`, true);
  await waitForSpace();
  isRunning = false;
}

async function findPath() {
  if (isRunning || nodes.length === 0) return;
  let s = parseInt(document.getElementById("startNode").value);
  let e = parseInt(document.getElementById("endNode").value);
  if (isNaN(s) || !nodes[s] || isNaN(e) || !nodes[e])
    return alert("Đỉnh không hợp lệ");

  isRunning = true;
  resetColors();
  addLog(`--- TÌM ĐƯỜNG ${s} ➔ ${e} ---`, true);
  updateStatus(`Đang tìm đường đi từ ${s} đến ${e}...`);

  let visited = new Array(nodes.length).fill(false);
  let parent = new Array(nodes.length).fill(null);
  let stack = [s];
  let found = false;

  while (stack.length > 0) {
    let u = stack.pop();
    if (!visited[u]) {
      visited[u] = true;
      nodes[u].color = "#e74c3c";
      addLog(`Xét đỉnh ${u}`);
      await waitForSpace();

      if (u === e) {
        found = true;
        updateStatus("ĐÃ THẤY ĐÍCH! Nhấn Space để hiện đường đi.");
        addLog(`Đã tìm thấy đích ${e}!`, true);
        await waitForSpace();
        break;
      }
      for (let v of nodes[u].adj) {
        if (!visited[v]) {
          parent[v] = u;
          stack.push(v);
        }
      }
    }
  }

  if (found) {
    let path = [];
    let c = e;
    while (c !== null) {
      path.push(c);
      nodes[c].color = "#f1c40f";
      c = parent[c];
    }
    let resultPath = path.reverse().join(" ➔ ");
    addLog(`Đường đi: ${resultPath}`, true);
    updateStatus("KẾT THÚC: Đã tìm thấy đường đi.");
  } else {
    addLog("KẾT QUẢ: Không tìm thấy đường đi.");
    updateStatus("KẾT THÚC: Không có đường đi.");
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

  // CHỨC NĂNG  (CLICK CHUỘT TRÁI)
  if (mouseButton === LEFT) {
    if (mode === "node") {
      let newNodeId = nodes.length;
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
  // BƯỚC 1: Đánh lại ID cho các đỉnh để mảng luôn liên tục (0, 1, 2...)
  nodes.forEach((n, index) => {
    let oldId = n.id;
    // Cập nhật các cạnh đang dùng ID cũ sang ID tạm thời (âm) để không bị lẫn
    edges.forEach((e) => {
      if (e.u === oldId) e.u = -100 - index;
      if (e.v === oldId) e.v = -100 - index;
    });
    n.id = index; // Gán ID mới
  });

  // Chuyển ID tạm thời về ID dương chuẩn
  edges.forEach((e) => {
    if (e.u <= -100) e.u = Math.abs(e.u) - 100;
    if (e.v <= -100) e.v = Math.abs(e.v) - 100;
  });

  // BƯỚC 2: Xây dựng lại danh sách kề (Adjacency List)
  nodes.forEach((n) => (n.adj = [])); // Reset trắng
  edges.forEach((e) => {
    // Chỉ thêm vào danh sách kề nếu cả 2 đỉnh tồn tại
    if (nodes[e.u] && nodes[e.v]) {
      nodes[e.u].adj.push(e.v);
      nodes[e.v].adj.push(e.u);
    }
  });
}

// Chặn menu chuột phải của trình duyệt trên toàn bộ trang web
document.oncontextmenu = function () {
  return false;
};
