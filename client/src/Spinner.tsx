import React from "react";
import { Loader, Dimmer } from "semantic-ui-react";

interface SpinnerProps {
  text?: string;
}

class Spinner extends React.Component<SpinnerProps> {
  override render() {
    return (
      <Dimmer active inverted>
        <Loader size="huge" inverted content={this.props.text} />
      </Dimmer>
    );
  }
}

export default Spinner;
