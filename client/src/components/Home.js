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
  Popup,
} from 'semantic-ui-react';
import Spinner from './../Spinner';
import { withRouter } from '../withRouter';
import MainLogo from './MainLogo/MainLogo';
import { updateDocumentTitle } from '../helpers/utils';
import { spotifyApi } from '../helpers/spotifyApi';

class Home extends React.Component {

  constructor(props) {
    super(props);
    this.handleModal = this.handleModal.bind(this);
  }

	  state = {
			error: null,
			user: null,
			isLoading: false,
	    exampleModalOpen: false,
		}
	
	  componentDidMount() {
			const params = new URLSearchParams(window.location.search);
			const authError = params.get('auth_error');
			if (authError) {
				this.setState({ error: new Error('Spotify authorization was cancelled or failed.') });
				this.props.navigate('/', { replace: true });
				return;
			}
			if (params.get('auth')) {
				this.props.navigate('/', { replace: true });
			}
			this.getAuthenticatedUser();
		}
	
	  getAuthenticatedUser = () => {
			this.setState({ isLoading: true });
			spotifyApi('/api/me')
				.then(data => {
					this.setState({ user: data });
					if (data && data.display_name) {
						updateDocumentTitle(data.display_name);
					}
				})
				.catch(error => {
					if (error.status === 401) {
						this.setState({ user: null });
					} else {
						console.error(error);
						this.setState({ error });
					}
				})
				.finally(() => {
					this.setState({ isLoading: false });
				});
		}

	  handleLogout = () => {
			spotifyApi('/api/logout', { method: 'POST' })
				.catch(error => console.error(error))
				.finally(() => {
					window.location = window.location.pathname;
				});
		}

  handleTypeChange = (value) => (e) => {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.append('collection_request_type', value);
    this.props.navigate('/collection?' + queryParams.toString());
	}

	  handleModal(boolean) {
    this.setState({ exampleModalOpen: boolean });
  }

  render() {
		const { isLoading, user, exampleModalOpen } = this.state;

	    let loginUrl = '/api/login';

    let profileUrl = 'default-profile-icon.jpeg';
    const exampleCollectionUrl = 'example-collection.jpeg';

    if (user && user.images && user.images.length) {
      profileUrl = user.images[0].url;
    }

		if (isLoading) {
			return <Spinner/>;
		}

	    if (this.state.error) {
	      return (
	        <div>
	          <div>
	            { this.state.error.message }
	          </div>
	          <div>
	          <Button onClick={() => this.setState({ error: null })}>
	            Home
	          </Button>
	          </div>
        </div>
      )
    }

		return (
			<React.Fragment>
				<div className="home-container">
          <div className="login-container">
              <div style={{ marginBottom: '3em' }}>
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
	                      <Button negative onClick={this.handleLogout}>
                        Log out
                      </Button>
                    </div>
                  </Form>
                : <React.Fragment>
                    <div className="login-info">
                      Create your personalized Spotify <Popup content='Click to see example collection' trigger={ <span className='example-click' onClick={() => this.handleModal(true)}>collection
                      </span> }/> snapshot based on what you listen to the most.
                    </div>
                    <a className="button primary-button" href={loginUrl}>Connect with Spotify</a>
                    <Divider className='footer-divider'  />
                    <p className='login-legal-notice'>
                      By continuing, you agree to the <a href='/legal#terms-of-service'>Terms of Service</a> and acknowledge the <a href='/legal#privacy-policy'>Privacy Policy</a>.
                    </p>
                    <Modal
                      onClose={() => this.handleModal(false)}
                      onOpen={() => this.handleModal(true)}
                      open={exampleModalOpen}
                    >
                      <ModalHeader>Example:</ModalHeader>
                      <ModalContent image className='example-modal-content'>
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
			</React.Fragment>
		)
	}
}

export default withRouter(Home);
