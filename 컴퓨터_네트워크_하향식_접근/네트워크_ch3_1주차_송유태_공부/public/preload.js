// Electron 프리로드 스크립트
// 보안이 유지된 상태로 Node.js API와 Electron IPC를 웹 컨텐츠에 노출하는 역할(앱이 보안 통신을 할 수 있게 해줌)
const { contextBridge, ipcRenderer } = require("electron");

// IPC 통신을 위한 API를 렌더러 프로세스에 노출
contextBridge.exposeInMainWorld("electron", {
  // 메인 프로세스로 메시지 전송
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },

  // 메인 프로세스로부터 메시지 수신 리스너 등록
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, data) => {
      callback(data);
    });
  },

  // 특정 채널의 모든 리스너 제거
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
