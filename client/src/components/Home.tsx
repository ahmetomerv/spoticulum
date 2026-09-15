import React from "react";
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
} from "semantic-ui-react";
import Spinner from "./../Spinner";
import { withRouter } from "../withRouter";
import MainLogo from "./MainLogo/MainLogo";
import { updateDocumentTitle } from "../helpers/utils";
import { spotifyApi } from "../helpers/spotifyApi";
import { SpotifyApiError } from "../helpers/spotifyApi";
import type { RouterProps } from "../types/navigation";
import type { CollectionRequestType, SpotifyProfile } from "../types/spotify";

interface HomeState {
  authError: string | null;
  error: Error | null;
  user: SpotifyProfile | null;
  isLoading: boolean;
  exampleModalOpen: boolean;
}

class Home extends React.Component<RouterProps, HomeState> {
  constructor(props: RouterProps) {
    super(props);
    this.handleModal = this.handleModal.bind(this);
  }

  override state: HomeState = {
    authError: null,
    error: null,
    user: null,
    isLoading: false,
    exampleModalOpen: false,
  };

  override componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) {
      const message =
        authError === "session_expired"
          ? "Your Spotify session expired. Connect again to continue."
          : authError === "access_denied"
            ? "Spotify authorization was cancelled. You can connect whenever you are ready."
            : "Spotify authorization failed. Please try connecting again.";
      this.setState({ authError, error: new Error(message) });
      window.history.replaceState({}, "", "/");
      return;
    }
    if (params.get("auth")) {
      window.history.replaceState({}, "", "/");
    }
    this.getAuthenticatedUser();
  }

  getAuthenticatedUser = () => {
    this.setState({ isLoading: true });
    spotifyApi<SpotifyProfile>("/api/me")
      .then((data) => {
        this.setState({ user: data });
        if (data && data.display_name) {
          updateDocumentTitle(data.display_name);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof SpotifyApiError && error.status === 401) {
          this.setState({ user: null });
        } else {
          console.error(error);
          this.setState({
            error:
              error instanceof Error
                ? error
                : new Error("Spotify request failed"),
          });
        }
      })
      .finally(() => {
        this.setState({ isLoading: false });
      });
  };

  handleLogout = () => {
    spotifyApi("/api/logout", { method: "POST" })
      .catch((error) => console.error(error))
      .finally(() => {
        window.location.href = window.location.pathname;
      });
  };

  handleTypeChange = (value: CollectionRequestType) => () => {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("collection_request_type", value);
    this.props.navigate("/collection?" + queryParams.toString(), {
      state: { user: this.state.user },
    });
  };

  handleModal(isOpen: boolean) {
    this.setState({ exampleModalOpen: isOpen });
  }

  override render() {
    const { authError, isLoading, user, exampleModalOpen } = this.state;

    const loginUrl = "/api/login";
    const exampleCollectionUrl = "/screenshot.jpeg";

    let profileUrl = "default-profile-icon.jpeg";

    if (user?.images[0]) {
      profileUrl = user.images[0].url;
    }

    if (isLoading) {
      return <Spinner />;
    }

    if (this.state.error) {
      return (
        <div>
          <div>{this.state.error.message}</div>
          <div>
            <a className="button primary-button" href="/api/login">
              {authError === "access_denied"
                ? "Connect with Spotify"
                : "Reconnect with Spotify"}
            </a>
          </div>
        </div>
      );
    }

    return (
      <React.Fragment>
        <div className="home-container">
          <div className="login-container">
            <div style={{ marginBottom: "3em" }}>
              <MainLogo displayLogoTitle={true} />
            </div>
            {user ? (
              <Form className="request-type-form">
                <Segment>
                  <label>Logged in as:</label>
                  <br />
                  <br />
                  <Image src={profileUrl} bordered avatar />
                  <span>
                    <a
                      href={user.external_urls?.spotify}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {user.display_name}
                    </a>
                  </span>
                </Segment>
                <br />
                <Form.Field>
                  <label>Generate based on what you listen to the most:</label>
                </Form.Field>
                <Form.Group className="request-type-form-group">
                  <Button onClick={this.handleTypeChange("artists")}>
                    Artists
                  </Button>
                  <Button onClick={this.handleTypeChange("tracks")}>
                    Albums
                  </Button>
                </Form.Group>
                <br />
                <br />
                <Divider />
                <br />
                <br />
                <div>
                  <Button negative onClick={this.handleLogout}>
                    Log out
                  </Button>
                </div>
              </Form>
            ) : (
              <React.Fragment>
                <div className="login-info">
                  Create a{" "}
                  <Popup
                    content="Click to see example collection"
                    trigger={
                      <span
                        className="example-click"
                        onClick={() => this.handleModal(true)}
                      >
                        visual snapshot
                      </span>
                    }
                  />{" "}
                  of your most-listened-to artists and albums.
                </div>
                <a className="button primary-button" href={loginUrl}>
                  Connect with Spotify
                </a>
                <Divider className="footer-divider" />
                <p className="login-legal-notice">
                  By continuing, you agree to the{" "}
                  <a href="/legal#terms-of-service">Terms of Service</a> and
                  acknowledge the{" "}
                  <a href="/legal#privacy-policy">Privacy Policy</a>.
                </p>
                <Modal
                  onClose={() => this.handleModal(false)}
                  onOpen={() => this.handleModal(true)}
                  open={exampleModalOpen}
                >
                  <ModalHeader>Example:</ModalHeader>
                  <ModalContent image className="example-modal-content">
                    <Image size="massive" src={exampleCollectionUrl} wrapped />
                  </ModalContent>
                  <ModalActions>
                    <Button onClick={() => this.handleModal(false)} positive>
                      Ok
                    </Button>
                  </ModalActions>
                </Modal>
              </React.Fragment>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default withRouter(Home);
