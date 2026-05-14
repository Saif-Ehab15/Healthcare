import React, { useState, useRef, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { useParams } from 'react-router-dom';
import './chat.css';
import axiosInstance from '../../../Config/axios';

const CHAT_AES_KEY = '1234567890123456';
const CHAT_AES_IV = '6543210987654321';
let cryptoKeyPromise = null;

const base64ToBytes = (base64) => {
  const normalized = (base64 || '').replace(/\s/g, '');
  const binary = window.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const getCryptoKey = async () => {
  if (!cryptoKeyPromise) {
    const keyBytes = new TextEncoder().encode(CHAT_AES_KEY);
    cryptoKeyPromise = window.crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );
  }
  return cryptoKeyPromise;
};

const tryDecryptMessageContent = async (content) => {
  if (!content || typeof content !== 'string') return content || '';
  try {
    const key = await getCryptoKey();
    const iv = new TextEncoder().encode(CHAT_AES_IV);
    const encryptedBytes = base64ToBytes(content);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      encryptedBytes
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch {
    return content;
  }
};

export const ChatPage = ({ doctorId, doctorName: providedDoctorName }) => {
  const { id: routeDoctorId } = useParams();
  const currentDoctorId = doctorId || routeDoctorId;
  const currentDoctorName = (providedDoctorName || '').trim();
  const [shelters, setShelters] = useState([]);
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendError, setSendError] = useState(null);
  const messagesEndRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user'));
  const ADOPTER_ID = user?.id;
  const [connection, setConnection] = useState(null);
  const [isHubConnected, setIsHubConnected] = useState(false);
  const hasStartedConnectionRef = useRef(false);
  const lastFetchedShelterRef = useRef(null);

  useEffect(() => {
    const fetchShelters = async () => {
      if (!currentDoctorId) {
        setShelters([]);
        setSelectedShelter(null);
        return;
      }

      try {
        const doctorResponse = await axiosInstance.get(`/api/Accounts/GetDoctors/${currentDoctorId}`);
        const doctorData = doctorResponse?.data ?? null;
        const fallbackDoctorName = currentDoctorName && currentDoctorName.length > 0
          ? currentDoctorName
          : 'Doctor';
        const doctorName =
          doctorData?.doctorName ??
          doctorData?.name ??
          doctorData?.fullName ??
          doctorData?.userName ??
          fallbackDoctorName;

        const doctorShelter = {
          id: doctorData?.id ?? doctorData?.doctorId ?? currentDoctorId,
          userName: currentDoctorName || doctorName
        };

        setShelters([doctorShelter]);
        setSelectedShelter(doctorShelter);
      } catch (error) {
        console.error('Error fetching doctor details:', error);
        const fallbackDoctor = {
          id: currentDoctorId,
          userName: currentDoctorName || 'Doctor'
        };
        setShelters([fallbackDoctor]);
        setSelectedShelter(fallbackDoctor);
      }
    };
    fetchShelters();
  }, [currentDoctorId]);

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:7250/messageHub')
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!connection || !isHubConnected || !selectedShelter || !ADOPTER_ID) return;

    const adopterId = String(ADOPTER_ID);
    const shelterId = String(selectedShelter.id);
    if (lastFetchedShelterRef.current === shelterId) return;

    const historyHandler = async (historyMessages) => {
      try {
        const responseList = Array.isArray(historyMessages) ? historyMessages : [];
        const formattedMessages = await Promise.all(
          responseList.map(async (msg) => ({
            ...msg,
            messageContent: await tryDecryptMessageContent(msg.messageContent),
            timestamp: new Date(msg.createdAt),
            isMine: String(msg.senderId) === adopterId,
            belongsToShelter:
              String(msg.receiverId) === shelterId || String(msg.senderId) === shelterId
          }))
        );

        lastFetchedShelterRef.current = shelterId;
        setMessages(formattedMessages);
        scrollToBottom();
      } catch (error) {
        console.error('Error processing chat history:', error);
      }
    };

    connection.off("ChatHistoryLoaded", historyHandler);
    connection.on("ChatHistoryLoaded", historyHandler);
    connection.invoke("LoadChatHistory", adopterId, shelterId, 1)
      .catch((error) => {
        lastFetchedShelterRef.current = null;
        console.error('Error loading chat history:', error);
      });

    return () => {
      connection.off("ChatHistoryLoaded", historyHandler);
    };
  }, [selectedShelter, connection, ADOPTER_ID, isHubConnected]);

  useEffect(() => {
    if (!connection || !ADOPTER_ID || hasStartedConnectionRef.current) return;

    hasStartedConnectionRef.current = true;
    let isUnmounted = false;
    let reconnectTimer = null;

    const scheduleReconnect = () => {
      if (isUnmounted || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startConnection();
      }, 2000);
    };

    const startConnection = () => {
      if (isUnmounted || connection.state === signalR.HubConnectionState.Connected) return;

      connection.start()
        .then(() => {
          if (isUnmounted) return;
          console.log("Connected to SignalR");
          setIsHubConnected(true);
          setSendError(null);
          connection.invoke("JoinUserGroup", ADOPTER_ID)
            .catch((err) => console.error('Error joining group:', err));
        })
        .catch((err) => {
          if (isUnmounted) return;
          console.error('SignalR Connection Error: ', err);
          setIsHubConnected(false);
          scheduleReconnect();
        });
    };

    const receiveHandler = (messageId, senderId, messageContent) => {
      const incomingMessage = {
        id: messageId,
        senderId,
        receiverId: ADOPTER_ID,
        messageContent,
        timestamp: new Date(),
        isMine: senderId === ADOPTER_ID,
        belongsToShelter: true
      };

      setMessages((prevMessages) => {
        if (!prevMessages.some((msg) => msg.id === messageId)) {
          return [...prevMessages, incomingMessage];
        }
        return prevMessages;
      });
      scrollToBottom();
    };

    connection.on("ReceiveMessage", receiveHandler);
    connection.onreconnecting(() => {
      setIsHubConnected(false);
    });
    connection.onreconnected(() => {
      setIsHubConnected(true);
      connection.invoke("JoinUserGroup", ADOPTER_ID)
        .catch((err) => console.error('Error re-joining group:', err));
    });
    connection.onclose(() => {
      setIsHubConnected(false);
      scheduleReconnect();
    });

    startConnection();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      connection.off("ReceiveMessage", receiveHandler);
    };
  }, [connection, ADOPTER_ID]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedShelter || !connection) return;
    if (connection.state !== signalR.HubConnectionState.Connected) {
      setSendError('Chat connection is not ready. Please wait and try again.');
      return;
    }

    const tempId = Math.random().toString(36).substr(2, 9);
    const newMessageData = {
      id: tempId,
      senderId: ADOPTER_ID,
      receiverId: selectedShelter.id.toString(),
      messageContent: newMessage,
      timestamp: new Date(),
      isMine: true,
      belongsToShelter: true,
      isTemporary: true
    };

    setMessages(prev => [...prev, newMessageData]);
    setNewMessage('');
    setSendError(null);

    try {
      await connection.invoke("SendMessageToUser", ADOPTER_ID, selectedShelter.id.toString(), newMessage);
      
      const successHandler = (messageId, senderId, content) => {
        if (senderId === ADOPTER_ID && content === newMessage) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? { ...msg, id: messageId, isTemporary: false } : msg
          ));
          connection.off("ReceiveMessage", successHandler);
        }
      };
      
      connection.on("ReceiveMessage", successHandler);
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError('Failed to send message. Please try again.');
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, isFailed: true } : msg
      ));
    }
  };

  const handleRetry = (messageId) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      setNewMessage(message.messageContent);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="shelters-list">
        <ul>
          {shelters.map((shelter) => (
            <li 
              key={shelter.id} 
              className={selectedShelter?.id === shelter.id ? 'active' : ''}
              onClick={() => setSelectedShelter(shelter)}
            >
              {shelter.userName}
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-area">
        {selectedShelter ? (
          <>
            <div className="messages-container">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.isMine ? 'sent' : 'received'} ${message.isFailed ? 'failed' : ''}`}>
                  <div className="message-header">
                    <span>{message.isMine ? 'You' : selectedShelter.userName}</span>
                    <span>{message.timestamp.toLocaleTimeString()}</span>
                    {message.isFailed && (
                      <button onClick={() => handleRetry(message.id)}>Retry</button>
                    )}
                  </div>
                  <div className="message-content">
                    {message.messageContent}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {sendError && <div className="error-message">{sendError}</div>}
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="select-shelter">Select The Doctor To Start Chatting</div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;