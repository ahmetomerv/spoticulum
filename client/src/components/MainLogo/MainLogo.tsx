import React from "react";

interface MainLogoProps {
  displayLogoTitle?: boolean;
}

class MainLogo extends React.Component<MainLogoProps> {
  override render() {
    return (
      <React.Fragment>
        <img
          className="spoticulum-logo"
          width="100"
          src="spoticulum-logo.png"
          alt="Spoticulum logo"
        />
        {this.props.displayLogoTitle && (
          <h1 className="spoticulum-title">Spoticulum</h1>
        )}
      </React.Fragment>
    );
  }
}

export default MainLogo;
