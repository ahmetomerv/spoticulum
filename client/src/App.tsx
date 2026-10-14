import "./App.css";
import React from "react";
import Main from "./components/Main";
import Footer from "./components/Footer";
import {
  disableAnalytics,
  enableAnalytics,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "./platform/analytics";

const googleAnalyticsId = process.env.REACT_APP_GA;
type AnalyticsConsent = "granted" | "denied";

interface AppProps {
  analyticsMeasurementId?: string;
}

interface AppState {
  showAnalyticsConsent: boolean;
}

class App extends React.Component<AppProps, AppState> {
  private readonly analyticsMeasurementId =
    this.props.analyticsMeasurementId ?? googleAnalyticsId;
  private readonly consentHeading = React.createRef<HTMLHeadingElement>();
  private readonly privacySettingsButton = React.createRef<HTMLButtonElement>();

  override state: AppState = {
    showAnalyticsConsent:
      Boolean(this.analyticsMeasurementId) && getAnalyticsConsent() === null,
  };

  override componentDidMount() {
    if (getAnalyticsConsent() === "granted")
      enableAnalytics(this.analyticsMeasurementId);
    else disableAnalytics(this.analyticsMeasurementId);
    if (this.state.showAnalyticsConsent) this.consentHeading.current?.focus();
  }

  handleAnalyticsChoice = (choice: AnalyticsConsent) => {
    setAnalyticsConsent(choice);
    if (choice === "granted") enableAnalytics(this.analyticsMeasurementId);
    else disableAnalytics(this.analyticsMeasurementId);
    this.setState({ showAnalyticsConsent: false }, () => {
      this.privacySettingsButton.current?.focus();
    });
  };

  openAnalyticsSettings = () => {
    this.setState({ showAnalyticsConsent: true }, () => {
      this.consentHeading.current?.focus();
    });
  };

  override render() {
    return (
      <div className="top-container">
        <Main />
        <Footer
          analyticsAvailable={Boolean(this.analyticsMeasurementId)}
          onOpenPrivacySettings={this.openAnalyticsSettings}
          privacySettingsRef={this.privacySettingsButton}
        />
        {this.state.showAnalyticsConsent && (
          <section
            className="analytics-consent"
            aria-labelledby="analytics-consent-heading"
          >
            <div>
              <h2
                id="analytics-consent-heading"
                ref={this.consentHeading}
                tabIndex={-1}
              >
                Optional analytics
              </h2>
              <p>
                Allow Google Analytics to help us understand site usage. It
                stays off unless you agree. See the{" "}
                <a href="/legal#privacy-policy">Privacy Policy</a>.
              </p>
            </div>
            <div className="analytics-consent-actions">
              <button
                type="button"
                onClick={() => this.handleAnalyticsChoice("denied")}
              >
                Decline
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => this.handleAnalyticsChoice("granted")}
              >
                Allow analytics
              </button>
            </div>
          </section>
        )}
      </div>
    );
  }
}

export default App;
