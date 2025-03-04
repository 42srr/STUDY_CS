// Sender 클래스
// Alternating Bit Protocol (ABT) 구현
// Electron IPC를 통해 데이터를 전송하고 ACK를 수신
class Sender {
  // socket은 실제 소켓 통신을 하는 객체가 아니고 IPC 통신을 위한 객체임
  constructor(socket, onStatusUpdate) {
    this.socket = socket; // IPC 통신 인터페이스
    this.currentBit = 0; // 현재 사용 중인 시퀀스 비트 (0 또는 1)
    this.currentPacket = null; // 현재 전송 중인 패킷
    this.waitingForAck = false; // ACK 대기 상태 플래그
    this.buffer = []; // 대기 중인 메시지 버퍼
    this.timeout = null; // 재전송 타이머
    this.retransmissionCount = 0; // 재전송 횟수
    this.onStatusUpdate = onStatusUpdate || (() => {}); // 상태 업데이트 콜백
  }

  // 데이터 전송
  send(data) {
    if (this.waitingForAck) {
      // 이미 패킷 전송 중이면 버퍼에 저장
      this.buffer.push(data);
      this.onStatusUpdate({
        action: "buffer",
        message: `데이터 "${data}" 버퍼에 저장됨`,
        buffer: [...this.buffer],
      });
      return;
    }

    // 즉시 패킷 전송 시작
    this.sendPacket(data);
  }

  // 패킷 생성 및 전송 프로세스 시작
  sendPacket(data) {
    // 패킷 생성 (시퀀스 번호, 데이터, 체크섬)
    this.currentPacket = {
      seqnum: this.currentBit,
      data: data,
      checksum: this.calculateChecksum(data, this.currentBit),
    };

    this.waitingForAck = true; // ACK 대기 상태 돌입
    this.transmitPacket(); // 패킷 전송
    this.setRetransmissionTimer(); // 재전송 타이머 설정

    // 상태 업데이트 알림
    this.onStatusUpdate({
      action: "send",
      message: `패킷 전송: 시퀀스 번호=${this.currentBit}, 데이터="${data}"`,
      packet: { ...this.currentPacket },
    });
  }

  // 실제 패킷 전송 수행
  transmitPacket() {
    this.socket.emit("send-packet", this.currentPacket);
  }

  // 재전송 타이머 설정
  setRetransmissionTimer() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.retransmissionCount++;
      this.onStatusUpdate({
        action: "timeout",
        message: `타임아웃 발생: 재전송 #${this.retransmissionCount}`,
        packet: { ...this.currentPacket },
      });
      this.transmitPacket();
      this.setRetransmissionTimer();
    }, 1000); // 1초 타임아웃 설정
  }

  // ACK 수신 처리
  receiveAck(ack) {
    // 올바른 ACK 수신시의 조건문
    if (ack.seqnum === this.currentBit) {
      clearTimeout(this.timeout);
      this.waitingForAck = false;
      this.retransmissionCount = 0;
      this.currentBit = 1 - this.currentBit; // 비트 전환 (0->1 또는 1->0)

      this.onStatusUpdate({
        action: "ack",
        message: `ACK 수신: 시퀀스 번호=${ack.seqnum}`,
        nextBit: this.currentBit,
      });

      // 버퍼에 데이터가 있으면 다음 전송
      if (this.buffer.length > 0) {
        const nextData = this.buffer.shift();
        this.onStatusUpdate({
          action: "dequeue",
          message: `버퍼에서 다음 데이터 "${nextData}" 처리`,
          buffer: [...this.buffer],
        });
        this.sendPacket(nextData);
      }
    } else {
      // 잘못된 ACK 수신시의 조건문
      this.onStatusUpdate({
        action: "invalid_ack",
        message: `잘못된 ACK 수신: 예상=${this.currentBit}, 실제=${ack.seqnum}`,
      });
    }
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

export default Sender;
