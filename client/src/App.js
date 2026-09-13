import './App.css';
import React from 'react';
import Main from './components/Main';
import Footer from './components/Footer';
import {
	disableAnalytics,
	enableAnalytics,
	getAnalyticsConsent,
	setAnalyticsConsent,
} from './platform/analytics';

const googleAnalyticsId = process.env.REACT_APP_GA;

class App extends React.Component {
	state = {
		showAnalyticsConsent: Boolean(googleAnalyticsId) && getAnalyticsConsent() === null,
	}

	componentDidMount() {
		if (getAnalyticsConsent() === 'granted') enableAnalytics(googleAnalyticsId);
		else disableAnalytics(googleAnalyticsId);
	}

	handleAnalyticsChoice = (choice) => {
		setAnalyticsConsent(choice);
		if (choice === 'granted') enableAnalytics(googleAnalyticsId);
		else disableAnalytics(googleAnalyticsId);
		this.setState({ showAnalyticsConsent: false });
	}

	openAnalyticsSettings = () => {
		this.setState({ showAnalyticsConsent: true });
	}

	render () {
		return (
			<div className='top-container'>
				<Main />
				<Footer
					analyticsAvailable={Boolean(googleAnalyticsId)}
					onOpenPrivacySettings={this.openAnalyticsSettings}
				/>
				{this.state.showAnalyticsConsent &&
					<aside className='analytics-consent' role='dialog' aria-label='Analytics privacy choice'>
						<div>
							<strong>Optional analytics</strong>
							<p>
								Allow Google Analytics to help us understand site usage. It stays off unless you agree. See the <a href='/legal#privacy-policy'>Privacy Policy</a>.
							</p>
						</div>
						<div className='analytics-consent-actions'>
							<button type='button' onClick={() => this.handleAnalyticsChoice('denied')}>Decline</button>
							<button className='primary-button' type='button' onClick={() => this.handleAnalyticsChoice('granted')}>Allow analytics</button>
						</div>
					</aside>
				}
			</div>
		)
	}
}

export default App;
