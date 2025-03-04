// src/App.js
import React, { useEffect } from "react";
import { HashRouter as Router, Route, Routes, Link } from "react-router-dom";
import SenderPage from "./components/SenderPage";
import ReceiverPage from "./components/ReceiverPage";
import "./App.css";

function App() {
  useEffect(() => {
    const openSenderWindow = () => {
      window.electron.send("create-sender-window");
    };

    const openReceiverWindow = () => {
      window.electron.send("create-receiver-window");
    };

    // 버튼에 이벤트 리스너 등록
    const senderBtn = document.querySelector(".sender-btn");
    const receiverBtn = document.querySelector(".receiver-btn");

    if (senderBtn) {
      senderBtn.addEventListener("click", openSenderWindow);
    }
    if (receiverBtn) {
      receiverBtn.addEventListener("click", openReceiverWindow);
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      if (senderBtn) {
        senderBtn.removeEventListener("click", openSenderWindow);
      }
      if (receiverBtn) {
        receiverBtn.removeEventListener("click", openReceiverWindow);
      }
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>ABT 프로토콜 시뮬레이터</h1>
          <nav>
            <ul>
              <li>
                <Link to="/sender">송신자</Link>
              </li>
              <li>
                <Link to="/receiver">수신자</Link>
              </li>
            </ul>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/sender" element={<SenderPage />} />
            <Route path="/receiver" element={<ReceiverPage />} />
            <Route
              path="/"
              element={
                <div className="welcome">
                  <h2>신뢰적인 트랜스포트 프로토콜 (ABT) 구현</h2>
                  <p>
                    아래 버튼을 클릭하여 송신자 또는 수신자 창을 열 수 있습니다.
                  </p>
                  <div className="window-buttons">
                    <button className="sender-btn">송신자 창 열기</button>
                    <button className="receiver-btn">수신자 창 열기</button>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
