import { GameUI } from './components/GameUI';
import './App.css';

function App() {
  return (
    <div
      className="min-h-screen bg-slate-900 text-white bg-cover bg-center bg-no-repeat w-full"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1601987177651-8edfe6c20009?q=80&w=2740&auto=format&fit=crop')"
      }}
    >
      <GameUI />
    </div>
  );
}

export default App;
