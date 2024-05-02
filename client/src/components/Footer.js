import React from 'react';
import {
  Segment,
  Icon,
  Container,
  Grid,
  Header,
  Popup,
} from 'semantic-ui-react';

class Footer extends React.Component {
  constructor(props) {
    super(props);
    this.handleFooterEmailClick = this.handleFooterEmailClick.bind(this);
  }

  state = {
    footerPopoverContent: 'Click to copy: ahmetomerv@gmail.com',
    footerPopoverIsOpen: false,
  }

  handleFooterEmailClick = () => {
    navigator.clipboard.writeText('ahmetomerv@gmail.com')
      .then(() => {
        this.setState({
          footerPopoverContent: 'Copied!',
        })
        setTimeout(() => {
          this.setState({
            footerPopoverContent: 'Click to copy: ahmetomerv@gmail.com',
            footerPopoverIsOpen: false,
          });
        }, 2000);
      })
      .catch((error) => {
        console.error('Error copying text to clipboard:', error);
      });
  };

	render () {
		return (
      <Segment className='footer' vertical>
        <Container>
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
                    size='small'
                    content={this.state.footerPopoverContent}
                    on='hover'
                    trigger={
                      <a>
                        <Icon name='mail' link={true} onClick={this.handleFooterEmailClick} />
                      </a>
                    }
                  />
                </div>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Container>
      </Segment>
		)
	}
}

export default Footer;
