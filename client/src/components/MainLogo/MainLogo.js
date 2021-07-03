import React from 'react';

class MainLogo extends React.Component {
  render() {
    return (
      <React.Fragment>
        <img className="spoticulum-logo" width="100" src="spoticulum-logo.png" alt="Spoticulum logo"/>
        { this.props.displayLogoTitle && (
          <h2 className="spoticulum-title">Spoticulum</h2>
        )}
      </React.Fragment>
    )
  }
}

export default MainLogo;
