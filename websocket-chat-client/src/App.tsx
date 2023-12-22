import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import styles from './ChatApp.module.css';

const getColorForClientId = (clientId) => {
  const hash = clientId.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return `hsl(${hash % 360}, 100%, 70%)`;
};

const ChatApp = () => {
  const [username, setUsername] = useState<string>('');
  const [readyToChat, setReadyToChat] = useState(false);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [awarenessStates, setAwarenessStates] = useState(new Map());

  const ydoc = useRef<Y.Doc>(new Y.Doc());
  const messageArray = useRef<Y.Array<IMessage>>(ydoc.current.getArray<IMessage>('messages'));
  const bottomOfMessagesRef = useRef<HTMLDivElement>(null);

  const providerRef = useRef<HocuspocusProvider>(null);
  const clientId = useRef(Math.random().toString(2));

  useEffect(() => {
    bottomOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    providerRef.current = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'chatroom',
      document: ydoc.current,
    });

    providerRef.current.setAwarenessField('user', {
      clientId: clientId.current,
      username,
      isTyping: false,
      typingText: '',
    });

    messageArray.current.observe(() => {
      setMessages([...messageArray.current.toArray()]);
    });

    const handleAwarenessUpdate = ({ states }) => {
      // Transform states into a Map or another suitable format
      const updatedStates = new Map();
      Object.keys(states).forEach(key => {
        updatedStates.set(key, states[key]);
      });
      setAwarenessStates(updatedStates);
    };

    providerRef.current.on('awarenessUpdate', handleAwarenessUpdate);

    return () => {
      providerRef.current?.destroy();
      providerRef.current?.off('awarenessUpdate', handleAwarenessUpdate);
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

    providerRef.current.setAwarenessField('user', {
      clientId: clientId.current,
      username,
      isTyping: false,
      typingText: '',
    });

  };

  const handleMessageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);

    providerRef.current?.setAwarenessField('user', {
      clientId: clientId.current,
      username,
      isTyping: event.target.value === '' ? false : true,
      typingText: event.target.value,
    });
  };

  const handleChangeUsername = () => {
    let newUsername = null;
    while (!newUsername) {
      newUsername = prompt('Please enter a new username:');
      if (newUsername) {
        setUsername(newUsername.trim());
      }
    }
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
        <button onClick={handleChangeUsername} className={styles.changeUsernameButton}>
          Change Username
        </button>
      </div>
      <div className={styles.messagesList}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.clientId === clientId.current ? styles.myMessage : styles.otherMessage}
            style={{
              backgroundColor: message.clientId === clientId.current ? 'white' : getColorForClientId(message.clientId),
            }}
          >
            <div>{message.text}</div>
            <div className={styles.messageMetadata}>
              <span>{message.username}</span>
              <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}

        {Array.from(awarenessStates.entries()).map(([key, value]) => {
          const userAwareness = value.user;
          if (userAwareness && userAwareness.isTyping && userAwareness.clientId !== clientId.current) {
            return (
            <div key={userAwareness.clientId} className={styles.typingBubble}>
              <div className={styles.typingText}>{userAwareness.typingText}</div>
              <div className={styles.typingUsername}>{userAwareness.username}</div>
            </div>
            );
          }
          return null;
        })}

        <div ref={bottomOfMessagesRef} />
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

