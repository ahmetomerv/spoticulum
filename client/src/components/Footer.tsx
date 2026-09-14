import React from "react";
import {
  Segment,
  Icon,
  Container,
  Grid,
  Header,
  Popup,
  Divider,
} from "semantic-ui-react";
import { withRouter } from "../withRouter";
import { Link } from "react-router-dom";
import type { RouterProps } from "../types/navigation";

interface FooterOwnProps {
  analyticsAvailable: boolean;
  onOpenPrivacySettings: () => void;
}

type FooterProps = FooterOwnProps & RouterProps;

interface FooterState {
  footerPopoverContent: string;
  footerPopoverIsOpen: boolean;
}

class Footer extends React.Component<FooterProps, FooterState> {
  constructor(props: FooterProps) {
    super(props);
    this.handleFooterEmailClick = this.handleFooterEmailClick.bind(this);
  }

  override state: FooterState = {
    footerPopoverContent: "Click to copy: spoticulum@ahmeto.com",
    footerPopoverIsOpen: false,
  };

  handleFooterEmailClick = () => {
    navigator.clipboard
      .writeText("spoticulum@ahmeto.com")
      .then(() => {
        this.setState({
          footerPopoverContent: "Copied!",
        });
        setTimeout(() => {
          this.setState({
            footerPopoverContent: "Click to copy: spoticulum@ahmeto.com",
            footerPopoverIsOpen: false,
          });
        }, 2000);
      })
      .catch((error) => {
        console.error("Error copying text to clipboard:", error);
      });
  };

  override render() {
    return (
      <Segment className="footer" vertical>
        <Container>
          <Grid divided inverted stackable>
            <Grid.Row>
              <Grid.Column>
                <Header
                  style={{ textAlign: "center", fontWeight: "normal" }}
                  as={"h5"}
                  inverted
                >
                  Made by{" "}
                  <a style={{ fontWeight: "bold" }} href="https://ahmeto.com">
                    Ahmet Ömer
                  </a>
                </Header>
                <div style={{ textAlign: "center", fontSize: "1.5em" }}>
                  <a
                    style={{ marginRight: ".6em" }}
                    href="https://github.com/ahmetomerv"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="github" />
                  </a>
                  <a
                    aria-label="X profile"
                    style={{ marginRight: ".6em" }}
                    href="https://x.com/ahmetdotme"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      className="x-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <Popup
                    size="small"
                    content={this.state.footerPopoverContent}
                    on="hover"
                    trigger={
                      <a>
                        <Icon
                          name="mail"
                          link={true}
                          onClick={this.handleFooterEmailClick}
                        />
                      </a>
                    }
                  />
                  <Divider className="footer-divider" />
                  <div>
                    <Link className="legal-link" to="/legal">
                      Terms of Service & Privacy Policy
                    </Link>
                    {this.props.analyticsAvailable && (
                      <button
                        className="privacy-settings-link"
                        type="button"
                        onClick={this.props.onOpenPrivacySettings}
                      >
                        Privacy settings
                      </button>
                    )}
                  </div>
                  <p className="spotify-disclaimer">
                    Spoticulum is independent and is not affiliated with Spotify
                    AB. Spotify is a trademark of Spotify AB; copyrighted
                    content belongs to its respective owners.
                  </p>
                </div>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Container>
      </Segment>
    );
  }
}

export default withRouter(Footer);
