import React from 'react';
import { Loader, Dimmer } from 'semantic-ui-react';

class Spinner extends React.Component {
	render() {
		return (
			<Dimmer active inverted>
				<Loader size="huge" inverted content={this.props.text} />
			</Dimmer>
		)
	}
}

export default Spinner;
