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

  const formatResponse = (text: string) => {
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  };

  const getResponse = async (question: string) => {
    setIsLoading(true);
    try {
      // Add user message
      setMessages(prev => [...prev, { content: question, isBot: false }]);

      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAbwp-WGQD5XoJHhMdd3z0NXYkvTJ8z8Mk",
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
    <div className="app">
      <h1>
        Indian Election Expert Chatbot 
        <button className="surprise" onClick={surprise}>
          Surprise Question
        </button>
      </h1>
      
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
              <div className="content">...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-container">
          <input
            value={inputMessage}
            placeholder="Ask about Indian elections..."
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            {isLoading ? "..." : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
