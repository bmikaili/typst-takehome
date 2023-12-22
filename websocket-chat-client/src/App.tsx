import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import styles from './ChatApp.module.css';

const ChatApp = () => {
  const [username, setUsername] = useState<string>('');
  const [readyToChat, setReadyToChat] = useState(false);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [awareness, setAwareness] = useState<Map<number, any>>(new Map());
  const ydoc = useRef<Y.Doc>(new Y.Doc());
  const messageArray = useRef<Y.Array<IMessage>>(ydoc.current.getArray<IMessage>('messages'));

  let provider: HocuspocusProvider | null = null;
  const clientId = useRef(Math.random().toString(36));

  useEffect(() => {
    provider = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'chatroom',
      document: ydoc.current,
      onAwarenessUpdate: ({ states }: any) => {
        setAwareness(new Map(states));
      },
    });

    provider.awareness?.setLocalStateField('user', {
      clientId: clientId.current,
      name: username,
      color: getColorForUsername(username),
      isTyping: false,
    });

    messageArray.current.observe(() => {
      setMessages([...messageArray.current.toArray()]);
    });

    return () => {
      provider?.destroy();
    };

  }, []);

  useEffect(() => {
    if (provider) {
      provider.awareness?.setLocalStateField('user', {
        clientId: clientId.current,
        name: username,
        color: getColorForUsername(username),
        isTyping: isTyping,
      });
    }
  }, [username, isTyping]);

  useEffect(() => {
    if (provider) {
      provider.awareness?.on('update', () => {
        setAwareness(new Map(provider?.awareness?.getStates()));
      });
    }
  }, [provider]);

  const getColorForUsername = (username: string): string => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 100%, 70%)`;
    return color;
  };

  const handleSendMessage = () => {
    if (inputValue.trim() !== '') {
      messageArray.current.push([
        {
          clientId: clientId.current,
          username,
          text: inputValue,
          timestamp: new Date().toISOString(),
        },
      ]);
      setInputValue('');
    }
  };

  const handleMessageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setIsTyping(event.target.value.length > 0);
  };

  const startChat = () => {
    const newUsername = prompt('Please enter your username');
    if (newUsername) {
      window.localStorage.setItem('username', newUsername);
      setUsername(newUsername || `User_${Math.floor(Math.random() * 1000)}`);
      setReadyToChat(true); // User is ready to chat
    }
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
              backgroundColor: message.clientId === clientId.current ? 'white' : getColorForUsername(message.username),
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

