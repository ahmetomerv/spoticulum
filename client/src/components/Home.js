import React from 'react';
import { Form, Image, Button, Divider, Segment } from 'semantic-ui-react';
import Spinner from './../Spinner';
import { withRouter } from '../withRouter';
import MainLogo from './MainLogo/MainLogo';
import { updateDocumentTitle, getHashParams } from '../helpers/utils';

class Home extends React.Component {

  state = {
		accessToken: '',
		refreshToken: '',
		tokenType: '',
		expiresIn: null,
		scope: '',
		error: null,
		user: null,
		isLoading: false,
	}

  componentDidMount() {
		const params = getHashParams();

		if (params) {
			this.setState({
				accessToken: params.access_token,
				refreshToken: params.refresh_token,
				expiresIn: params.expires_in,
				scope: params.scope,
				tokenType: params.token_type,
			}, () => {
				if (params.access_token) {
					this.getAuthenticatedUser(params.access_token);
				}
			});
		}
	}

  getAuthenticatedUser = (accessToken) => {
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
					updateDocumentTitle(data.display_name);
				}
			})
			.catch(error => {
				console.error(error);
				this.setState({ error });
			})
			.finally(() => {
				this.setState({ isLoading: false });
			});
	}

  handleTypeChange = (value) => (e) => {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.append('graph_request_type', value);
    this.props.navigate('/graph?' + queryParams.toString());
	}

  render() {
		const { isLoading, user } = this.state;
    let profileUrl = 'default-profile-icon-16.jpg';

    if (user && user.images) {
      profileUrl = user.images[0].url;
    }

		if (isLoading) {
			return <Spinner/>;
		}

    if (user && user.error) {
      return (
        <div>
          <div>
            { user.error.status }: { user.error.message }
          </div>
          <div>
            Please login again
          </div>
          <div>
          <Button onClick={() => window.location = window.location.pathname }>
            Home
          </Button>
          </div>
        </div>
      )
    }

		return (
			<React.Fragment>
				<div className="container">
          <div className="login-container">
            <div>
              <div style={{ marginBottom: '5em' }}>
                <MainLogo displayLogoTitle={true} />
              </div>
              { user
                ? <Form className="request-type-form">
                    <Segment>
                      <label>
                        Logged in as:
                      </label>
                      <br/><br/>
                      <Image src={profileUrl} bordered avatar />
                      <span>
                        <a href={user.external_urls?.spotify} target='_blank' rel="noreferrer">
                          { user.display_name }
                        </a>
                      </span>
                    </Segment>
                    <br/>
                    <Form.Field>
                      <label>
                        Generate based on:
                      </label>
                    </Form.Field>
                    <Form.Group className="request-type-form-group">
                      <Button onClick={this.handleTypeChange('artists')}>Artists</Button>
                      <Button onClick={this.handleTypeChange('tracks')}>Albums</Button>
                    </Form.Group>
                    <br/><br/>
                    <Divider/>
                    <br/><br/>
                    <div>
                      <Button negative onClick={() => window.location = window.location.pathname }>
                        Log out
                      </Button>
                    </div>
                  </Form>
                : <React.Fragment>
                    <p className="login-info">Login to generate your profile graph based on what you listen to the most.<br/>Authentication is safe and handled by Spotify.</p>
                    <a className="button primary-button" href="http://localhost:8888/api/login">Login with Spotify</a>
                  </React.Fragment>
            }
            </div>
          </div>
				</div>
			</React.Fragment>
		)
	}
}

export default withRouter(Home);
