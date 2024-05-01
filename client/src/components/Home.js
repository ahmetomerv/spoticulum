import React from 'react';
import {
  Form,
  Image,
  Button,
  Divider,
  Segment,
  ModalHeader,
  ModalContent,
  ModalActions,
  Modal,
  Icon,
  Container,
  Grid,
  Header,
  Popup,
} from 'semantic-ui-react';
import Spinner from './../Spinner';
import { withRouter } from '../withRouter';
import MainLogo from './MainLogo/MainLogo';
import { updateDocumentTitle, getHashParams } from '../helpers/utils';

class Home extends React.Component {

  constructor(props) {
    super(props);
    this.handleModal = this.handleModal.bind(this);
  }

  state = {
		accessToken: '',
		refreshToken: '',
		tokenType: '',
		expiresIn: null,
		scope: '',
		error: null,
		user: null,
		isLoading: false,
    exampleModalOpen: false,
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
    queryParams.append('collection_request_type', value);
    this.props.navigate('/collection?' + queryParams.toString());
	}

  isDev = () => {
    return !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
  }

  handleModal(boolean) {
    this.setState({ exampleModalOpen: boolean });
  }

  render() {
		const { isLoading, user, exampleModalOpen } = this.state;

    const copyToClipboard = () => {
      navigator.clipboard.writeText('ahmetomerv@gmail.com')
        .then(() => {})
        .catch((error) => {
          console.error('Error copying text to clipboard:', error);
        });
    };

    let loginUrl = 'https://spoticulum.xyz/api/login';

    if (this.isDev()) {
      loginUrl = 'http://localhost:8888/api/login';
    }

    let profileUrl = 'default-profile-icon-16.jpg';
    const exampleCollectionUrl = 'example-collection.png';

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
                        Generate based on what you listen to the most:
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
                    <div className="login-info">
                      Login to generate your Spotify <Popup content='See example collection' trigger={ <span className='example-click' onClick={() => this.handleModal(true)}>collection
                      </span> }/> based on what you listen to the most.
                      <br/>
                      Authentication is handled by Spotify.
                    </div>
                    <a className="button primary-button" href={loginUrl}>Login with Spotify</a>
                    <Modal
                      onClose={() => this.handleModal(false)}
                      onOpen={() => this.handleModal(true)}
                      open={exampleModalOpen}
                    >
                      <ModalHeader>Example:</ModalHeader>
                      <ModalContent image>
                        <Image size='massive' src={exampleCollectionUrl} wrapped />
                      </ModalContent>
                      <ModalActions>
                        <Button onClick={() => this.handleModal(false)} positive>
                          Ok
                        </Button>
                      </ModalActions>
                    </Modal>
                  </React.Fragment>
            }
            </div>
          </div>
          <Segment inverted vertical style={{ padding: '3em 0em' }}>
            <Container className='footer'>
              <Grid divided inverted stackable>
                <Grid.Row>
                  <Grid.Column>
                    <Header style={{ textAlign: 'center', fontWeight: 'normal' }} as={'h5'} inverted>
                      Made by <a style={{ fontWeight: 'bold' }} href='https://ahmetomer.net'>Ahmet Ömer</a>
                    </Header>
                    <div style={{ textAlign: 'center', fontSize: '1.5em' }}>
                      <a style={{ marginRight: '.6em' }} href='https://github.com/ahmetomerv' target='_blank' rel='noopener noreferrer'>
                        <Icon name='github' />
                      </a>
                      <Popup
                        content="Click to copy email"
                        trigger={
                          <Icon name='mail' link={true} onClick={copyToClipboard} />
                        }
                      />
                    </div>
                  </Grid.Column>
                </Grid.Row>
              </Grid>
            </Container>
          </Segment>
				</div>
			</React.Fragment>
		)
	}
}

export default withRouter(Home);
