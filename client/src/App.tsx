import "./App.css";
import React from "react";
import Main from "./components/Main";
import Footer from "./components/Footer";

class App extends React.Component {
  override render() {
    return (
      <div className="top-container">
        <Main />
        <Footer />
      </div>
    );
  }
}

export default App;
