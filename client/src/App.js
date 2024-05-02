import './App.css';
import React from 'react';
import Main from './components/Main';
import ReactGA from 'react-ga4';
import Footer from './components/Footer';

const googleAnalyticsId = process.env.REACT_APP_GA;

if (googleAnalyticsId) {
	ReactGA.initialize(googleAnalyticsId);
}

class App extends React.Component {
	render () {
		return (
			<div className='top-container'>
				<Main />
				<Footer />
			</div>
		)
	}
}

export default App;
