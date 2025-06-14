import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Users, MessageSquare, Wifi, WifiOff, User } from 'lucide-react';
import { socketService, ChatMessage, UserTyping } from '../../lib/socket';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  isAuthenticated: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  onClose,
  currentUser,
  isAuthenticated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen && !socketService.isConnected()) {
      connectToChat();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isOpen, currentUser, isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectToChat = () => {
    const socket = socketService.connect(currentUser, isAuthenticated);
    
    if (socket) {
      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socketService.onPrivateMessage((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
      });

      socketService.onMessageSent((data) => {
        // Add sent message to local state
        const sentMessage: ChatMessage = {
          id: `sent_${Date.now()}`,
          from: currentUser,
          to: data.to,
          message: data.message,
          timestamp: data.timestamp
        };
        setMessages(prev => [...prev, sentMessage]);
      });

      socketService.onMessageError((error) => {
        console.error('Message error:', error);
        // You could show a toast notification here
      });

      socketService.onUsersUpdated((users: string[]) => {
        // Filter out current user from the list
        const otherUsers = users.filter(user => user !== currentUser);
        setOnlineUsers(otherUsers);
      });

      socketService.onUserTyping((data: UserTyping) => {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (data.typing) {
            newSet.add(data.from);
          } else {
            newSet.delete(data.from);
          }
          return newSet;
        });

        // Clear typing indicator after 3 seconds
        if (data.typing) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.from);
              return newSet;
            });
          }, 3000);
        }
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedUser || !isConnected) return;

    const success = socketService.sendPrivateMessage(selectedUser, newMessage.trim());
    
    if (success) {
      setNewMessage('');
      stopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (selectedUser && e.target.value.trim() && !isTyping) {
      startTyping();
    } else if (!e.target.value.trim() && isTyping) {
      stopTyping();
    }
  };

  const startTyping = () => {
    if (!isTyping && selectedUser) {
      setIsTyping(true);
      socketService.startTyping(selectedUser);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    }
  };

  const stopTyping = () => {
    if (isTyping && selectedUser) {
      setIsTyping(false);
      socketService.stopTyping(selectedUser);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const getConversationMessages = () => {
    if (!selectedUser) return [];
    
    return messages.filter(msg => 
      (msg.from === currentUser && msg.to === selectedUser) ||
      (msg.from === selectedUser && msg.to === currentUser)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex">
        
        {/* Sidebar - User List */}
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="glass-header p-4 text-white border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 icon-shadow-white-sm" />
                <h3 className="font-semibold text-shadow-white-sm">Chat</h3>
              </div>
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-400 icon-shadow-white-sm" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400 icon-shadow-white-sm" />
                )}
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 icon-shadow-white-sm" />
                </button>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="p-3 border-b border-gray-700">
            <div className={`text-xs px-2 py-1 rounded-full text-center ${
              isConnected 
                ? 'bg-green-900/30 text-green-300 border border-green-700' 
                : 'bg-red-900/30 text-red-300 border border-red-700'
            }`}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>

          {/* Online Users */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  Online Users ({onlineUsers.length})
                </span>
              </div>
              
              {onlineUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No other users online</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {onlineUsers.map((user) => (
                    <button
                      key={user}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full p-3 rounded-lg text-left transition-all duration-200 flex items-center space-x-3 ${
                        selectedUser === user
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          Guest {user}
                        </p>
                        {typingUsers.has(user) && (
                          <p className="text-xs opacity-75 italic">typing...</p>
                        )}
                      </div>
                      <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="glass-header p-4 text-white border-b border-gray-700">
            {selectedUser ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-shadow-white-sm">Guest {selectedUser}</h3>
                  {typingUsers.has(selectedUser) && (
                    <p className="text-xs text-blue-200 text-shadow-white-sm italic">typing...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="font-semibold text-shadow-white-sm">Select a user to start chatting</h3>
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedUser ? (
              <>
                {getConversationMessages().length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  getConversationMessages().map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.from === currentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.from === currentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.from === currentUser ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Welcome to Fellowship Chat</p>
                  <p className="text-sm">Select a user from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          {selectedUser && (
            <div className="border-t border-gray-700 p-4">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message Guest ${selectedUser}...`}
                  disabled={!isConnected}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
              
              {!isConnected && (
                <p className="text-xs text-red-400 mt-2">
                  Disconnected from chat server. Trying to reconnect...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;