import './App.css';
import React from 'react';
import Main from './components/Main';
import ReactGA from 'react-ga4';

const googleAnalyticsId = process.env.REACT_APP_GA;

if (googleAnalyticsId) {
	ReactGA.initialize(googleAnalyticsId);
}

class App extends React.Component {
	render () {
		return (
		<div className="App">
      <Main />
    </div>
		)
	}
}

export default App;
