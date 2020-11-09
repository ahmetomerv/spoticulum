import './App.css';
import React from 'react';
import Spinner from './Spinner';
import CanvasGraph from './CanvasGraph/CanvasGraph';

class App extends React.Component {

  state = {
    accessToken: '',
    refreshToken: '',
    tokenType: '',
    expiresIn: null,
    scope: '',
    error: null,
    requestedType: 'artists',
    timeRange: 'medium_term',
    artists: [],
    tracks: [],
    user: null,
    nextUrl: '',
    isLoading: false,
    canGenerateGraph: false,
  }

  componentDidMount() {
    const params = this.getHashParams();

    if (params) {
      this.setState({
        accessToken: params.access_token,
        refreshToken: params.refresh_token,
        expiresIn: params.expires_in,
        scope: params.scope,
        tokenType: params.token_type,
      }, () => {
        const { requestedType } = this.state;
        const getTopCallback = () => {
          if (this.state.nextUrl) {
            this.getTop(params.access_token, requestedType, this.state.nextUrl, getTopCallback);
          } else {
            this.setState({ canGenerateGraph: true });
          }
        }
    
        if (params.access_token) {
          this.getAuthenticatedUser(params.access_token, () => {
            this.getTop(params.access_token, requestedType, null, () => {
              this.getTop(params.access_token, requestedType, this.state.nextUrl, getTopCallback);
            });
          });
        }
      });
    }

  }

  getHashParams = () => {
    const hashParams = {};
    let e,
        r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.search.substring(1);

    while (e = r.exec(q)) {
      hashParams[e[1]] = decodeURIComponent(e[2]);
    }

    return hashParams;
  }

  updateDocumentTitle = (title) => {
    if (title) {
      document.title = 'Spoticulum of ' + title;
    }
  }
  
  getAuthenticatedUser = (accessToken, callback) => {
    this.setState({ isLoading: true });
    const url = 'https://api.spotify.com/v1/me';
    const headers = {
      Authorization: 'Bearer ' + accessToken
    }

    fetch(url, { headers })
      .then(response => response.json())
      .then(data => {
        this.setState({ user: data });
        if (data && data.display_name) {
          this.updateDocumentTitle(data.display_name);
        }
      })
      .catch(error => {
        console.error(error);
        this.setState({ error });
      })
      .finally(() => {
        this.setState({ isLoading: false });
        callback();
      });
  }

  getTop = (accessToken, requestedType, nextUrl, callback) => {
    this.setState({ isLoading: true });

    let url;
    let params = new URLSearchParams({
      time_range: this.state.timeRange,
    });
    const headers = {
      Authorization: 'Bearer ' + accessToken
    };

    if (nextUrl && nextUrl.length > 0) {
      url = nextUrl;
    } else {
      url = 'https://api.spotify.com/v1/me/top/' + requestedType + '?' + params;
    }

    fetch(url , { headers })
      .then(response => response.json())
      .then(data => {
        this.setState({
          [requestedType]: [...this.state[requestedType], ...data.items],
          nextUrl: data.next,
        });
      })
      .catch(error => {
        console.error(error);
        this.setState({ error });
      })
      .finally(() => {
        callback();
        this.setState({ isLoading: false });
      });
  }

  //handleGenerateClick = () => this.setState({ canGenerateGraph: true });

  render() {
    
    return (
      <React.Fragment>
        { this.state.isLoading ? <Spinner/> : null }

        <div className="container">
          { this.state.canGenerateGraph
            ? <CanvasGraph artists={this.state.artists} user={this.state.user}/>
            : <div className="login-container">
                <div style={{ marginBottom: '5em' }}>
                  <img className="spotify-logo" width="100" src="spotify-logo.png" alt="Spoticulum logo"/>
                  <h2>Spoticulum</h2>
                </div>
                <p className="login-info">Login with Spotify to generate your profile graph based on what you listen to the most. <br/>Authentication is safe and handled by Spotify.</p>
                <a className="button primary-button" href="http://www.spoticulum.xyz/api/login">Login with Spotify</a>
                {/*<a className="button primary-button" style={{ marginLeft: '1em' }} onClick={this.handleGenerateClick} >Generate</a>*/}
              </div>
          }
        </div>
      </React.Fragment>
    )
  }
}

export default App;

