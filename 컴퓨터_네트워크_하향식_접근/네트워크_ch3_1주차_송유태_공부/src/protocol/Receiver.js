// Receiver 클래스
// 자세한 코드 소개는 Sender.js의 주석 참고
class Receiver {
  constructor(socket, onDataReceived, onStatusUpdate) {
    this.socket = socket;
    this.expectedBit = 0;
    this.onDataReceived = onDataReceived || (() => {});
    this.onStatusUpdate = onStatusUpdate || (() => {});
  }

  start() {
    this.socket.on("receive-packet", (packet) => {
      this.receive(packet);
    });
  }

  // 패킷 수신 처리
  receive(packet) {
    // 패킷 수신 로깅
    this.onStatusUpdate({
      action: "receive",
      message: `패킷 수신: 시퀀스 번호=${packet.seqnum}, 데이터="${packet.data}"`,
      packet: { ...packet },
    });

    // 체크섬 검증
    const calculatedChecksum = this.calculateChecksum(
      packet.data,
      packet.seqnum
    );

    // 체크섬 오류시 (= 손상된 패킷)
    if (calculatedChecksum !== packet.checksum) {
      this.onStatusUpdate({
        action: "checksum_error",
        message: `체크섬 오류: 예상=${calculatedChecksum}, 실제=${packet.checksum}`,
      });

      // 손상된 패킷에 대한 이전 ACK 재전송
      this.sendAck(1 - this.expectedBit);
      return;
    }

    // 예상된 시퀀스 번호와 일치하는 패킷일 경우
    if (packet.seqnum === this.expectedBit) {
      this.deliverData(packet.data); // 데이터 전달
      this.sendAck(this.expectedBit); // 현재 비트에 대한 ACK 전송
      this.expectedBit = 1 - this.expectedBit; // 다음 예상 비트로 전환

      // 상태 업데이트
      this.onStatusUpdate({
        action: "deliver",
        message: `데이터 전달: "${packet.data}"`,
        nextExpectedBit: this.expectedBit,
      });
    } else {
      // 중복 패킷 (= 이미 처리한 패킷이 재전송된 경우)
      this.onStatusUpdate({
        action: "duplicate",
        message: `중복 패킷: 예상=${this.expectedBit}, 실제=${packet.seqnum}`,
      });
      // 이전 ACK 재전송 (= 송신자가 이전 ACK를 못 받았을 수 있음)
      this.sendAck(1 - this.expectedBit);
    }
  }

  // 확인응답(ACK) 전송
  sendAck(seqnum) {
    const ack = { seqnum };
    this.socket.emit("send-ack", ack);

    // ACK 전송 로깅
    this.onStatusUpdate({
      action: "send_ack",
      message: `ACK 전송: 시퀀스 번호=${seqnum}`,
      ack,
    });
  }

  // 상위 계층으로 데이터 전달
  deliverData(data) {
    this.onDataReceived(data);
  }

  // 체크섬 계산
  calculateChecksum(data, seqnum) {
    let sum = seqnum;
    for (let i = 0; i < data.length; i++) {
      sum += data.charCodeAt(i);
    }
    return sum % 256; // 8비트 체크섬
  }
}

export default Receiver;
