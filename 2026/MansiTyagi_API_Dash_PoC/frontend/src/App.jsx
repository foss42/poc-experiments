import { useState } from 'react';
import './App.css';

function App() {
  const [chatLog, setChatLog] = useState([
    { role: 'ai', type: 'text', content: 'Hello! I am your API Dash Agent. What dataset would you like to evaluate?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleSend = async () => {
    if (!inputText) return;
    
    // 1. Add user's message to the chat
    const newChat = [...chatLog, { role: 'user', type: 'text', content: inputText }];
    setChatLog(newChat);
    setInputText('');
    setIsEvaluating(true);

    // 2. Pretend the AI is thinking, then call our Python Tool
    setTimeout(async () => {
      setChatLog(prev => [...prev, { role: 'ai', type: 'text', content: `Understood. Running evaluation on the "${inputText}" dataset via our Python MCP tool...` }]);
      
      try {
        // 3. Make the actual request to the FastAPI server you just built!
        const response = await fetch(`http://127.0.0.1:8000/run_evaluation?dataset_name=${inputText}`, {
          method: 'POST'
        });
        const data = await response.json();

        // 4. THIS IS THE AGENTIC UI: Instead of printing JSON text, we push a "card" type to the chat
        setChatLog(prev => [...prev, { role: 'ai', type: 'evaluation_card', data: data }]);
      } catch (error) {
        setChatLog(prev => [...prev, { role: 'ai', type: 'text', content: 'Error: Could not reach the Python server. Is Uvicorn running?' }]);
      }
      setIsEvaluating(false);
    }, 1000);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: 'sans-serif', border: '1px solid #ccc', borderRadius: '8px', padding: '20px' }}>
      <h2>API Dash: Agentic UI PoC</h2>
      
      <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '20px', borderRadius: '8px', backgroundColor: '#fafafa' }}>
        {chatLog.map((msg, index) => (
          <div key={index} style={{ marginBottom: '15px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            
            {/* Standard Text Message */}
            {msg.type === 'text' && (
              <span style={{ display: 'inline-block', padding: '10px', borderRadius: '8px', backgroundColor: msg.role === 'user' ? '#007bff' : '#e9ecef', color: msg.role === 'user' ? 'white' : 'black' }}>
                {msg.content}
              </span>
            )}

            {/* AGENTIC UI COMPONENT: Render the Custom Card using the Python JSON data */}
            {msg.type === 'evaluation_card' && (
              <div style={{ display: 'inline-block', padding: '15px', borderRadius: '8px', backgroundColor: '#fff', border: '2px solid #28a745', textAlign: 'left', minWidth: '250px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>📊 Evaluation Complete</h4>
                <p style={{ margin: '5px 0' }}><strong>Dataset:</strong> {msg.data.dataset}</p>
                <p style={{ margin: '5px 0' }}><strong>Accuracy:</strong> {msg.data.metrics.accuracy}%</p>
                <p style={{ margin: '5px 0' }}><strong>Latency:</strong> {msg.data.metrics.latency_ms} ms</p>
                <p style={{ margin: '5px 0', color: 'green' }}><strong>Pass Rate:</strong> {msg.data.metrics.pass_rate}</p>
              </div>
            )}

          </div>
        ))}
        {isEvaluating && <p style={{ color: '#888', fontStyle: 'italic' }}>⚙️ AI is evaluating...</p>}
      </div>

      <div style={{ display: 'flex' }}>
        <input 
          value={inputText} 
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a dataset name (e.g., iris, mnist)..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button onClick={handleSend} disabled={isEvaluating} style={{ padding: '10px 20px', marginLeft: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Send
        </button>
      </div>
    </div>
  );
}

export default App;