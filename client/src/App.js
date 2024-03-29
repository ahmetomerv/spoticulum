import './App.css';
import React from 'react';
import { Form, Image } from 'semantic-ui-react';
import Spinner from './Spinner';
import CanvasGraph from './components/CanvasGraph/CanvasGraph';
import MainLogo from './components/MainLogo/MainLogo';
import mediaEntityMapper from './helpers/mediaEntityMapper';
import { updateDocumentTitle, getHashParams } from './helpers/utils';

class App extends React.Component {

	state = {
		accessToken: '',
		refreshToken: '',
		tokenType: '',
		expiresIn: null,
		scope: '',
		error: null,
		requestedType: '',
		timeRange: 'medium_term',
		mediaEntities: [],
		user: null,
		nextUrl: '',
		isLoading: false,
		canGenerateGraph: false,
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

	getTop = (accessToken, requestedType, nextUrl, callback) => {
		this.setState({ isLoading: true });

		let url;
		let params = new URLSearchParams({ time_range: this.state.timeRange });
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
			.then(res => {
				const data = res.items.map(mediaEntityMapper);
				this.setState({
					mediaEntities: [...this.state.mediaEntities, ...data],
					nextUrl: res.next,
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

	handleTypeChange = (e, { value }) => {
		this.setState({ requestedType: value }, () => {
			const { requestedType, accessToken } = this.state;
			const getTopCallback = () => {
				if (this.state.nextUrl) {
					this.getTop(accessToken, requestedType, this.state.nextUrl, getTopCallback);
				} else {
					this.setState({ canGenerateGraph: true });
				}
			}
	
			this.getTop(accessToken, requestedType, null, () => {
				this.getTop(accessToken, requestedType, this.state.nextUrl, getTopCallback);
			});
		});
	}

	render() {
		const { isLoading, canGenerateGraph, requestedType, mediaEntities, user } = this.state;

		if (isLoading) {
			return <Spinner/>;
		}
		
		return (
			<React.Fragment>

				<div className="container">
					{ canGenerateGraph
						? <CanvasGraph
								requestedMediaType={requestedType}
								mediaEntities={mediaEntities}
								user={user}
							/>
						: <div className="login-container">
							<div>
								<div style={{ marginBottom: '5em' }}>
									<MainLogo displayLogoTitle={true} />
								</div>

								{ user
									? <Form className="request-type-form">
											<Form.Field>
												<label>
													Logged in as
												</label>
												<Image src={user.images.length ? user.images[0].url : 'default-profile-icon-16.jpg'} bordered avatar />
												<span>{ user.display_name }</span>
											</Form.Field>
											<br/>
											<Form.Field>
												<label>
													Generate based on:
												</label>
											</Form.Field>
											<Form.Group className="request-type-form-group">
												<Form.Radio
													label='Artists'
													value='artists'
													checked={requestedType === 'artists'}
													onChange={this.handleTypeChange}
												/>
												<Form.Radio
													label='Albums'
													value='tracks'
													checked={requestedType === 'tracks'}
													onChange={this.handleTypeChange}
												/>
											</Form.Group>
										</Form>
									: <React.Fragment>
											<p className="login-info">Login with Spotify to generate your profile graph based on what you listen to the most.<br/>Authentication is safe and handled by Spotify.</p>
											<a className="button primary-button" href="http://www.spoticulum.xyz/api/login">Login with Spotify</a>
										</React.Fragment>
								}
							</div>
						</div>
					}
				</div>
			</React.Fragment>
		)
	}
}

export default App;
