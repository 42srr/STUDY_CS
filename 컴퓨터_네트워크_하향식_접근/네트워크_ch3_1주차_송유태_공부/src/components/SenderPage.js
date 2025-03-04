// SenderPage 컴포넌트
import React, { useState, useEffect, useRef } from "react";
import Sender from "../protocol/Sender";
import "./SenderPage.css";

const SenderPage = () => {
  // 상태 관리
  const [connected, setConnected] = useState(false); // 연결 상태
  const [message, setMessage] = useState(""); // 입력 메시지
  const [logs, setLogs] = useState([]); // 로그 기록
  const [buffer, setBuffer] = useState([]); // 전송 대기 버퍼
  const senderRef = useRef(null); // Sender 인스턴스 참조

  useEffect(() => {
    // Sender 인스턴스 생성
    senderRef.current = new Sender(
      {
        // IPC 통신을 위한 인터페이스 객체 생성
        emit: (channel, data) => {
          // 이벤트와 데이터를 main 프로세스로 전송
          window.electron.send(channel, data);
        },
      },
      handleStatusUpdate // 상태 업데이트 콜백 등록
    );

    // ACK 이벤트 리스너 등록 (= 수신자로부터의 확인응답 수신)
    window.electron.on("receive-ack", (ack) => {
      if (senderRef.current) {
        senderRef.current.receiveAck(ack);
      }
    });

    // 연결 상태 설정
    setConnected(true);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.electron.removeAllListeners("receive-ack");
    };
  }, []);

  // 상태 업데이트 처리 함수
  const handleStatusUpdate = (status) => {
    // 현재 시간으로 타임스탬프 추가
    const timestamp = new Date().toLocaleTimeString();
    // 로그에 상태 추가
    setLogs((prevLogs) => [...prevLogs, { timestamp, ...status }]);

    // 버퍼 상태가 업데이트된 경우 반영
    if (status.buffer !== undefined) {
      setBuffer(status.buffer);
    }
  };

  // 메시지 전송 처리 함수
  const handleSend = () => {
    // 메시지가 비어있거나 Sender가 없으면 무시
    if (!message.trim() || !senderRef.current) return;

    // 메시지 전송
    senderRef.current.send(message);
    // 입력 필드 초기화
    setMessage("");
  };

  // 패킷 손상 테스트 함수
  const handleCorruptPacket = () => {
    // 현재 전송 중인 패킷이 없으면 무시
    if (!senderRef.current || !senderRef.current.currentPacket) return;

    // 현재 패킷의 체크섬을 손상시킴 (1 증가시켜 의도적 오류 발생)
    const corruptedPacket = {
      ...senderRef.current.currentPacket,
      checksum: (senderRef.current.currentPacket.checksum + 1) % 256,
    };

    // 손상된 패킷 전송
    window.electron.send("send-packet", corruptedPacket);

    // 로그에 기록
    handleStatusUpdate({
      action: "corrupt",
      message: "손상된 패킷 전송",
      packet: corruptedPacket,
    });
  };

  // UI 렌더링
  return (
    <div className="sender-page">
      <h2>송신자 (ABT)</h2>
      {/* 연결 상태 표시 */}
      <div className="connection-status">
        상태: {connected ? "연결됨" : "연결 중..."}
      </div>

      {/* 메시지 입력 폼 */}
      <div className="message-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="전송할 메시지 입력"
          disabled={!connected}
        />
        <button onClick={handleSend} disabled={!connected || !message.trim()}>
          전송
        </button>
      </div>

      {/* 패킷 손상 테스트 버튼 */}
      <div className="control-buttons">
        <button
          onClick={handleCorruptPacket}
          disabled={!connected || !senderRef.current?.currentPacket}
        >
          패킷 손상시키기 (테스트용)
        </button>
      </div>

      {/* 버퍼 상태 표시 */}
      <div className="buffer-display">
        <h3>버퍼 상태</h3>
        {buffer.length === 0 ? (
          <p>버퍼가 비어 있습니다</p>
        ) : (
          <ul>
            {buffer.map((item, index) => (
              <li key={index}>{item}</li>
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

export default SenderPage;
