import MapDisplay from "./components/MapDisplay";
import "./App.css";

const App = () => (
  <div className="app-container">
    <div className="header">
      <h1>Flight distances appear differently in each projection.</h1>
      <p className="subtitle-highlight">
        Tissot's indicatrices reveal where distance perception becomes misleading.
      </p>
      <p className="scale-note">
        Note: Straight lines represent great-circle routes (true shortest path on the globe)
      </p>
    </div>
    <MapDisplay />
  </div>
);

export default App;
