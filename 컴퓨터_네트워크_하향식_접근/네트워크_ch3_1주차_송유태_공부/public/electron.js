// 일렉트론 메인 프로세스
// 데스크톱앱의 창을 관리하고 프로세스 간 IPC 통신 담당
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
// const isDev = require("electron-is-dev");

// 창 관리를 위한 Set 생성
let windows = new Set();

// 메인 창 생성 함수
function createMainWindow() {
  // 생성되는 창에 대한 옵션 설정
  let mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // 셋팅된 URL 로드
  mainWindow.loadURL("http://localhost:3200");

  // 창 관리 Set에 메인창 추가
  windows.add(mainWindow);

  // 창이 닫힐 때 관리 Set에서 제거
  mainWindow.on("closed", () => {
    windows.delete(mainWindow);
    mainWindow = null;
  });

  return mainWindow;
}

// 송신자 창 생성 함수
function createSenderWindow() {
  let senderWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // URL에 라우트 파라미터를 추가하여 송신자 페이지로 이동
  senderWindow.loadURL("http://localhost:3200/#/sender");

  windows.add(senderWindow);

  senderWindow.on("closed", () => {
    windows.delete(senderWindow);
    senderWindow = null;
  });
}

// 수신자 창 생성 함수
function createReceiverWindow() {
  let receiverWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // URL에 라우트 파라미터를 추가하여 수신자 페이지로 이동
  receiverWindow.loadURL("http://localhost:3200/#/receiver");

  windows.add(receiverWindow);

  receiverWindow.on("closed", () => {
    windows.delete(receiverWindow);
    receiverWindow = null;
  });
}

// 앱 준비 완료 시 실행되는 이벤트 핸들러
app.on("ready", () => {
  createMainWindow();

  // IPC 이벤트 리스너 등록
  // 송신자 창 생성 요청 처리
  ipcMain.on("create-sender-window", createSenderWindow);
  // 수신자 창 생성 요청 처리
  ipcMain.on("create-receiver-window", createReceiverWindow);

  // 창 간 메시지 중계 (= 패킷 전송 해줌)
  ipcMain.on("send-packet", (event, packet) => {
    // 메시지를 보낸 창을 제외한 모든 창에 패킷 전달
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents !== event.sender) {
        win.webContents.send("receive-packet", packet);
      }
    }
  });

  // 창 간 메시지 중계 (= ACK 전송 해줌)
  ipcMain.on("send-ack", (event, ack) => {
    // 메시지를 보낸 창을 제외한 모든 창에 ACK 전달
    for (const win of windows) {
      if (!win.isDestroyed() && win.webContents !== event.sender) {
        win.webContents.send("receive-ack", ack);
      }
    }
  });
});

// 모든 창이 닫혔을 때 앱 종료 (macOS 제외)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// macOS에서 앱 아이콘 클릭 시 창이 없으면 새 창 생성
app.on("activate", () => {
  if (windows.size === 0) {
    createMainWindow();
  }
});
