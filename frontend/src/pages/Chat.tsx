import { useState, useRef, useEffect } from "react";
import axios from "axios";

interface Message {
  content: string;
  isBot: boolean;
}

export default function ChatBot() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const surpriseOptions = [
    "Explain the election process in India",
    "What is EVM and how does it work?",
    "List major political parties in India",
    "What is the role of Election Commission of India?",
    "Explain VVPAT system in Indian elections",
    "What are the key challenges in Indian elections?",
    "How is election security maintained in India?",
    "What is the Model Code of Conduct?",
    "Explain voter registration process in India",
    "What are the recent electoral reforms in India?",
    "How does vote counting work in India?",
    "What is NOTA in Indian elections?",
    "Explain the election symbol allocation process",
    "What are the qualifications to become an MP in India?",
    "How are election dates decided in India?",
    "Explain the electoral bond system",
    "What is the anti-defection law?",
    "How does coalition government work in India?",
    "What is the difference between Lok Sabha and Rajya Sabha?",
    "Explain the role of observers in elections"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add first welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        content: "Welcome to the Indian Election Expert Chatbot! Ask me anything about Indian elections, electoral processes, or political systems.",
        isBot: true
      }]);
    }
  }, []);

  const formatResponse = (text: string) => {
    // First replace bold formatting
    let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Handle bullet points by replacing markdown list items with HTML list items
    // First split into lines
    const lines = formatted.split('\n');
    const formattedLines = lines.map(line => {
      // Check if the line is a bullet point (starts with - or *)
      if (line.trim().match(/^[\*\-]\s+/)) {
        // Convert to HTML list item, preserving the content after the bullet
        return '<li>' + line.trim().replace(/^[\*\-]\s+/, '') + '</li>';
      }
      return line;
    });
    
    // If we have list items, wrap them in a ul
    if (formattedLines.some(line => line.startsWith('<li>'))) {
      formatted = '<ul style="padding-left: 20px; margin: 10px 0;">' + 
                  formattedLines.join('') + 
                  '</ul>';
    } else {
      formatted = formattedLines.join('\n');
    }
    
    return formatted;
  };

  const getResponse = async (question: string) => {
    setIsLoading(true);
    try {
      // Add user message
      setMessages(prev => [...prev, { content: question, isBot: false }]);

      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR KEY",
        {
          contents: [{
            parts: [{
              text: `Act as an election expert. Answer this question about Indian elections: ${question}. 
              Provide a short, accurate answer in bullet points with **bold** formatting for key terms.`
            }]
          }]
        }
      );

      const responseText = response.data.candidates[0].content.parts[0].text;
      const formattedResponse = formatResponse(responseText);

      setMessages(prev => [...prev, { 
        content: formattedResponse, 
        isBot: true 
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        content: "Sorry, I couldn't fetch the response. Please try again.",
        isBot: true
      }]);
    } finally {
      setIsLoading(false);
      setInputMessage("");
    }
  };

  const surprise = () => {
    const randomQuestion = surpriseOptions[Math.floor(Math.random() * surpriseOptions.length)];
    setInputMessage(randomQuestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      getResponse(inputMessage);
    }
  };

  return (
    <>
      {/* Bootstrap CSS and JS */}
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet" />
      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
      
      {/* Custom CSS */}
      <style>{`
        .chat-container {
          max-height: 70vh;
          min-height: 70vh;
          border-radius: 10px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background-color: #f8f9fa;
        }
        
        .message {
          margin-bottom: 1rem;
          max-width: 80%;
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message.user {
          margin-left: auto;
        }
        
        .message .content {
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          display: inline-block;
        }
        
        .message.bot .content {
          background-color: #e9ecef;
          border-top-left-radius: 0;
        }
        
        .message.user .content {
          background-color: #0d6efd;
          color: white;
          border-top-right-radius: 0;
        }
        
        .typing-indicator {
          display: flex;
          padding: 0.5rem 1rem;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          background-color: #6c757d;
          border-radius: 50%;
          display: inline-block;
          margin-right: 3px;
          animation: bounce 1s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.1s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.2s;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        .header-text {
          color: #0d6efd;
          font-weight: 700;
          text-shadow: 1px 1px 3px rgba(0,0,0,0.1);
        }
        
        .surprise-btn {
          transition: all 0.2s ease;
        }
        
        .surprise-btn:hover {
          transform: scale(1.05);
        }
        
        .form-control:focus {
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
        }
      `}</style>
      
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="d-flex align-items-center justify-content-between mb-4">
              <h1 className="header-text">
                <i className="bi bi-chat-dots-fill me-2"></i>
                Indian Election Expert
              </h1>
              <button 
                className="btn btn-outline-primary surprise-btn d-flex align-items-center" 
                onClick={surprise}
              >
                <i className="bi bi-lightning-fill me-2"></i>
                Surprise Question
              </button>
            </div>
            
            <div className="chat-container">
              <div className="messages">
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.isBot ? "bot" : "user"}`}>
                    <div 
                      className="content"
                      dangerouslySetInnerHTML={{ __html: msg.content }}
                    />
                  </div>
                ))}
                {isLoading && (
                  <div className="message bot">
                    <div className="content typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 bg-white border-top">
                <form onSubmit={handleSubmit} className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    value={inputMessage}
                    placeholder="Ask about Indian elections..."
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isLoading}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary d-flex align-items-center"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    ) : (
                      <>
                        <i className="bi bi-send-fill me-1"></i>
                        Ask
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
            
            <div className="mt-3 text-center text-muted small">
              <p>© 2025 Indian Election Expert Chatbot | Powered by Gemini AI</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
