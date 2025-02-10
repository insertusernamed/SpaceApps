import "./App.css";
import ErrorBoundary from "./components/ErrorBoundary";

/**Views**/
import LandingPage from "./components/LandingPage";
import MapComponent from "./components/MapComponent";

function App() {
    return (
        <main>
            <LandingPage />
            <ErrorBoundary>
                <MapComponent />
            </ErrorBoundary>
        </main>
    );
}

export default App;
