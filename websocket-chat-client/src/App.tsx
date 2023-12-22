import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import styles from './ChatApp.module.css';

const getColorForUsername = () => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 100%, 70%)`;
};

const ChatApp = () => {
  const userColor = useRef('');
  const [username, setUsername] = useState<string>('');
  const [readyToChat, setReadyToChat] = useState(false);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const ydoc = useRef<Y.Doc>(new Y.Doc());
  const messageArray = useRef<Y.Array<IMessage>>(ydoc.current.getArray<IMessage>('messages'));

  let provider: HocuspocusProvider | null = null;
  const clientId = useRef(Math.random().toString(36));

  if (!userColor.current) {
    userColor.current = getColorForUsername();
  }

  useEffect(() => {
    provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'chatroom',
      document: ydoc.current,
    });

    messageArray.current.observe(() => {
      setMessages([...messageArray.current.toArray()]);
    });

    return () => {
      provider?.destroy();
    };

  }, []);

  const handleSendMessage = () => {
    messageArray.current.push([
      {
        clientId: clientId.current,
        username,
        text: inputValue,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInputValue('');
  };

  const handleMessageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const startChat = () => {
    let newUsername = null;
    while (!newUsername) {
      newUsername = prompt('Please enter your username:');
    }
    setUsername(newUsername);
    setReadyToChat(true);
  };


  if (!readyToChat) {
    return (
      <div className={styles.startChatButtonContainer}>
        <button className={styles.startChatButton} onClick={startChat}>Start Chat</button>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <h1>Group chat</h1>
        <button>⚙️</button>
      </div>
      <div className={styles.messagesList}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.clientId === clientId.current ? styles.myMessage : styles.otherMessage}
            style={{
              backgroundColor: message.clientId === clientId.current ? 'white' : userColor.current,
            }}
          >
            <div>{message.text}</div>
            <div className={styles.messageMetadata}>
              <span>{message.username}</span>
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.messageInputContainer}>
        <input
          type="text"
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleMessageInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSendMessage()
            }
          }}
          className={styles.inputField}
        />
        <button onClick={handleSendMessage} className={styles.sendButton}>
          Send
        </button>
      </div>
    </div >
  );
};

export default ChatApp;

