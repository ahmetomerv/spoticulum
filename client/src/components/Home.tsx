import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
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
import MainLogo from "./MainLogo/MainLogo";
import { updateDocumentTitle } from "../helpers/utils";
import { spotifyApi, SpotifyApiError } from "../helpers/spotifyApi";
import { parseSpotifyProfile } from "../helpers/spotifyProfile";
import type { CollectionRequestType, SpotifyProfile } from "../types/spotify";

type HomeView =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; profile: SpotifyProfile }
  | { status: "oauth-error"; message: string; linkLabel: string }
  | { status: "request-error"; message: string };

function oauthErrorView(code: string): HomeView {
  if (code === "access_denied")
    return {
      status: "oauth-error",
      message:
        "Spotify authorization was cancelled. You can connect whenever you are ready.",
      linkLabel: "Connect with Spotify",
    };
  return {
    status: "oauth-error",
    message:
      code === "session_expired"
        ? "Your Spotify session expired. Connect again to continue."
        : "Spotify authorization failed. Please try connecting again.",
    linkLabel: "Reconnect with Spotify",
  };
}

function Home() {
  const navigate = useNavigate();
  const initialAuthError = useRef(
    new URLSearchParams(window.location.search).get("auth_error"),
  ).current;
  const [view, setView] = useState<HomeView>(() =>
    initialAuthError ? oauthErrorView(initialAuthError) : { status: "loading" },
  );
  const [requestAttempt, setRequestAttempt] = useState(0);
  const [exampleModalOpen, setExampleModalOpen] = useState(false);
  const exampleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("auth_error") || params.has("auth"))
      window.history.replaceState({}, "", "/");
    if (initialAuthError) return;

    const controller = new AbortController();
    let active = true;
    spotifyApi<unknown>("/api/me", { signal: controller.signal })
      .then(parseSpotifyProfile)
      .then((profile) => {
        if (!active) return;
        setView({ status: "authenticated", profile });
        if (profile.display_name) updateDocumentTitle(profile.display_name);
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (error instanceof SpotifyApiError && error.status === 401) {
          setView({ status: "guest" });
        } else {
          setView({
            status: "request-error",
            message:
              error instanceof Error ? error.message : "Spotify request failed",
          });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [initialAuthError, requestAttempt]);

  const handleLogout = () => {
    spotifyApi("/api/logout", { method: "POST" })
      .catch((error) => console.error(error))
      .finally(() => {
        window.location.href = window.location.pathname;
      });
  };

  const handleTypeChange = (
    value: CollectionRequestType,
    profile: SpotifyProfile,
  ) => {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set("collection_request_type", value);
    navigate("/collection?" + queryParams.toString(), {
      state: { user: profile },
    });
  };

  if (view.status === "loading") return <Spinner />;

  if (view.status === "oauth-error")
    return (
      <div>
        <p>{view.message}</p>
        <a className="button primary-button" href="/api/login">
          {view.linkLabel}
        </a>
      </div>
    );

  if (view.status === "request-error")
    return (
      <div>
        <p role="alert">{view.message}</p>
        <button
          type="button"
          className="button primary-button"
          onClick={() => {
            setView({ status: "loading" });
            setRequestAttempt((attempt) => attempt + 1);
          }}
        >
          Try again
        </button>
      </div>
    );

  const profile = view.status === "authenticated" ? view.profile : null;
  const profileUrl = profile?.images[0]?.url || "default-profile-icon.jpeg";

  return (
    <div className="home-container">
      <div className="login-container">
        <div style={{ marginBottom: "3em" }}>
          <MainLogo displayLogoTitle={true} />
        </div>
        {profile ? (
          <div className="ui form request-type-form">
            <Segment>
              <span>Logged in as:</span>
              <br />
              <br />
              <Image src={profileUrl} bordered avatar />
              <span>
                {profile.external_urls?.spotify ? (
                  <a
                    href={profile.external_urls.spotify}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {profile.display_name || profile.id}
                  </a>
                ) : (
                  profile.display_name || profile.id
                )}
              </span>
            </Segment>
            <br />
            <div className="field">
              <p>Generate based on what you listen to the most:</p>
            </div>
            <div className="fields request-type-form-group">
              <Button
                type="button"
                onClick={() => handleTypeChange("artists", profile)}
              >
                Artists
              </Button>
              <Button
                type="button"
                onClick={() => handleTypeChange("tracks", profile)}
              >
                Albums
              </Button>
            </div>
            <br />
            <br />
            <Divider />
            <br />
            <br />
            <div>
              <Button type="button" negative onClick={handleLogout}>
                Log out
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="login-info">
              Create a{" "}
              <Popup
                content="Click to see example collection"
                trigger={
                  <button
                    type="button"
                    ref={exampleButtonRef}
                    className="example-click"
                    onClick={() => setExampleModalOpen(true)}
                  >
                    visual snapshot
                  </button>
                }
              />{" "}
              of your most-listened-to artists and albums.
            </div>
            <a className="button primary-button" href="/api/login">
              Connect with Spotify
            </a>
            <Divider className="footer-divider" />
            <p className="login-legal-notice">
              By continuing, you agree to the{" "}
              <a href="/legal#terms-of-service">Terms of Service</a> and
              acknowledge the <a href="/legal#privacy-policy">Privacy Policy</a>
              .
            </p>
            <Modal
              onClose={() => setExampleModalOpen(false)}
              onOpen={() => setExampleModalOpen(true)}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                exampleButtonRef.current?.focus();
              }}
              open={exampleModalOpen}
            >
              <ModalHeader>Example:</ModalHeader>
              <ModalContent image className="example-modal-content">
                <Image size="massive" src="/screenshot.jpeg" wrapped />
              </ModalContent>
              <ModalActions>
                <Button
                  type="button"
                  onClick={() => setExampleModalOpen(false)}
                  positive
                >
                  Ok
                </Button>
              </ModalActions>
            </Modal>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
