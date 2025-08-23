import AttackGlobe from "./components/Globe";

function App() {
  return (
    <div className="bg-black text-white">
      <AttackGlobe />
      <div className="absolute top-4 left-4 text-lg font-bold z-10">
        Live DDoS Attack Simulation
      </div>
    </div>
  );
}

export default App;
