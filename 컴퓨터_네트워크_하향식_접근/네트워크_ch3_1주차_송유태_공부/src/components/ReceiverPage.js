// ReceiverPage 컴포넌트
import React, { useState, useEffect, useRef } from "react";
import Receiver from "../protocol/Receiver";
import "./ReceiverPage.css";

const ReceiverPage = () => {
  // 상태 관리
  const [connected, setConnected] = useState(false); // 연결 상태
  const [receivedMessages, setReceivedMessages] = useState([]); // 수신된 메시지 목록
  const [logs, setLogs] = useState([]); // 로그 기록
  const receiverRef = useRef(null); // Receiver 인스턴스 참조

  useEffect(() => {
    // Receiver 인스턴스 생성
    receiverRef.current = new Receiver(
      {
        // IPC 통신을 위한 인터페이스 객체 생성
        emit: (channel, data) => {
          // 이벤트와 데이터를 main 프로세스로 전송
          window.electron.send(channel, data);
        },
        on: (channel, callback) => {
          // main 프로세스로부터 이벤트 수신
          window.electron.on(channel, callback);
        },
      },
      handleDataReceived, // 데이터 수신 콜백 등록
      handleStatusUpdate // 상태 업데이트 콜백 등록
    );

    // 수신자 시작 (= 패킷 수신 리스너 등록)
    receiverRef.current.start();

    // 연결 상태 설정
    setConnected(true);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.electron.removeAllListeners("receive-packet");
    };
  }, []);

  // 데이터 수신 처리 함수
  const handleDataReceived = (data) => {
    // 현재 시간으로 타임스탬프 추가
    const timestamp = new Date().toLocaleTimeString();
    // 수신된 메시지 목록에 추가
    setReceivedMessages((prevMessages) => [
      ...prevMessages,
      { timestamp, data },
    ]);
  };

  // 상태 업데이트 처리 함수
  const handleStatusUpdate = (status) => {
    // 현재 시간으로 타임스탬프 추가
    const timestamp = new Date().toLocaleTimeString();
    // 로그에 상태 추가
    setLogs((prevLogs) => [...prevLogs, { timestamp, ...status }]);
  };

  // UI 렌더링
  return (
    <div className="receiver-page">
      <h2>수신자 (ABT)</h2>
      {/* 연결 상태 표시 */}
      <div className="connection-status">
        상태: {connected ? "연결됨" : "연결 중..."}
      </div>

      {/* 수신된 메시지 목록 표시 */}
      <div className="received-messages">
        <h3>수신된 메시지</h3>
        {receivedMessages.length === 0 ? (
          <p>아직 수신된 메시지가 없습니다</p>
        ) : (
          <ul>
            {receivedMessages.map((msg, index) => (
              <li key={index}>
                <span className="timestamp">{msg.timestamp}</span>
                <span className="message">{msg.data}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 로그 표시 영역 */}
      <div className="logs">
        <h3>로그</h3>
        <div className="log-entries">
          {logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.action}`}>
              <span className="timestamp">{log.timestamp}</span>
              <span className="message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReceiverPage;
