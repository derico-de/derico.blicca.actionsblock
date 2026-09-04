# Derico Blicca Actionsblock

Aurora Actions block: renders one category of Plone actions (site actions, portal tabs, user, object actions) as a list of links

## Features

- Compatible with Plone 6.0+

## Installation

Add `derico.blicca.actionsblock` to your project's dependencies:

```python
# In your pyproject.toml
dependencies = [
    "derico.blicca.actionsblock",
    # ...
]
```

Then activate the addon in your Plone site's control panel or via GenericSetup.

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/collective/derico.blicca.actionsblock.git
cd derico.blicca.actionsblock

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install in development mode
pip install -e ".[test]"
```

### Running Tests

```bash
pytest
```

### Running Tests with Coverage

```bash
pytest --cov=derico.blicca.actionsblock --cov-report=html
```

## License

GPL-2.0-or-later

## Author

Maik Derstappen <md@derico.de>
