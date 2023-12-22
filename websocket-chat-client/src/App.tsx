import { HocuspocusProvider, onAwarenessUpdateParameters } from '@hocuspocus/provider';
import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import styles from './ChatApp.module.css';
import { IMessage } from './interfaces';

const getColorForClientId = (clientId: string) => {
  // Generate a color based on the client ID
  // https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
  const hash = clientId.split('').reduce((acc: number, char: string) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
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

  const providerRef = useRef<HocuspocusProvider | null>(null);
  const clientId = useRef(Math.random().toString(2));

  // Scroll to the bottom of the messages container when the messages change
  useEffect(() => {
    bottomOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    providerRef.current = new HocuspocusProvider({
      url: 'ws://127.0.0.1:1234',
      name: 'chatroom',
      document: ydoc.current,
    });

    // Observe changes to the messages array
    messageArray.current.observe(() => {
      setMessages([...messageArray.current.toArray()]);
    });


    // Handle awareness updates
    const handleAwarenessUpdate = ({ states }: onAwarenessUpdateParameters) => {
      const updatedStates = new Map();
      for (const [clientId, state] of Object.entries(states)) {
        updatedStates.set(clientId, state);
      }

      // Update the awareness states
      setAwarenessStates(updatedStates);
    };

    // Subscribe to awareness updates
    providerRef.current.on('awarenessUpdate', handleAwarenessUpdate);

    // Clean up
    return () => {
      providerRef.current?.destroy();
      providerRef.current?.off('awarenessUpdate', handleAwarenessUpdate);
    };
  }, []);

  const handleSendMessage = () => {
    // Add the message to the messages array
    messageArray.current.push([
      {
        clientId: clientId.current,
        username,
        text: inputValue,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInputValue('');

    // Update the awareness state
    providerRef.current?.setAwarenessField('user', {
      clientId: clientId.current,
      username,
      isTyping: false,
      typingText: '',
    });

  };

  const handleMessageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);

    // Update the awareness state
    providerRef.current?.setAwarenessField('user', {
      clientId: clientId.current,
      username,
      isTyping: event.target.value === '' ? false : true,
      typingText: event.target.value,
    });
  };

  const handleChangeUsername = () => {
    // Set the username to null to trigger the prompt
    let newUsername = null;

    // Loop until the user enters a username
    while (!newUsername) {
      newUsername = prompt('Please enter a new username:');
      if (newUsername) {
        setUsername(newUsername.trim());
      }
    }
  };

  // Start the chat
  const startChat = () => {
    let newUsername = null;
    while (!newUsername) {
      newUsername = prompt('Please enter your username:');
    }
    setUsername(newUsername);
    setReadyToChat(true);
  };


  // If the user hasn't entered a username, prompt them to do so
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
        {/* Render the messages */}
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

        {/* Render the typing bubbles */}
        {Array.from(awarenessStates.entries()).map(([, value]) => {
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

        {/* Render the bottom of the messages container for scrolling*/}
        <div ref={bottomOfMessagesRef} />
      </div>

      {/* Render the message input */}
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

