var Nav = ReactBootstrap.Nav;
var NavItem = ReactBootstrap.NavItem;
var NavDropdown = ReactBootstrap.NavDropdown;
var Navbar = ReactBootstrap.Navbar;
var MenuItem = ReactBootstrap.MenuItem;

var Navigation = React.createClass({
  render(){
    return(
        <Navbar inverse>
          <Navbar.Header>
	    <Navbar.Brand>
              <a href="/">iot</a>
	    </Navbar.Brand>
	    <Navbar.Toggle />
	  </Navbar.Header>
	  <Navbar.Collapse>
	    <Nav pullRight>
	      <NavDropdown eventKey={1} title="User" id="user-dropdown">
                <MenuItem eventKey={1.1} href="/admin">admin</MenuItem>
                <MenuItem eventKey={1.2} href="/logout">logout</MenuItem>
	      </NavDropdown>
	    </Nav>
	  </Navbar.Collapse>
	</Navbar>
    ); 
  }
});

ReactDOM.render(
  <Navigation />,
  document.getElementById('navbar')
);
