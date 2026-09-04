"""Reading the stored JSON, and the tables that are spelled twice.

``actions_data`` is the Python twin of ``bundle-src/src/actions/data.ts``.
The category table, the default and the scheme allowlist live in both,
because the two renderers run in different languages, so the risk this file
exists for is a **one-sided edit**: a category added in TS and not here would
let the canvas offer a list the public page draws as the default one.

``TestParity`` is Python-reads-TS: reading a TS literal from Python is much
the cheaper way round.
"""

import re
from pathlib import Path

import pytest

from derico.blicca.actionsblock import actions_data


DATA_TS = Path(__file__).resolve().parents[5] / "bundle-src" / "src" / "actions" / "data.ts"

_ARRAY = r"export const {name} = \[([^;]*?)\](?: as const)?;"
_SCALAR = r"export const {name} = '([^']*)';"


def ts_source():
    return DATA_TS.read_text(encoding="utf-8")


def ts_array(name):
    """A ``export const NAME = ['a', 'b'] as const;`` literal, as a tuple."""
    match = re.search(_ARRAY.format(name=name), ts_source(), re.DOTALL)
    assert match, f"no `export const {name} = [...]` in {DATA_TS}"
    return tuple(re.findall(r"'([^']*)'", match.group(1)))


def ts_pairs(name):
    """A ``export const NAME = [['a', 'A'], ...] as const;`` literal, as pairs."""
    match = re.search(_ARRAY.format(name=name), ts_source(), re.DOTALL)
    assert match, f"no `export const {name} = [...]` in {DATA_TS}"
    return tuple(re.findall(r"\['([^']*)',\s*'([^']*)'\]", match.group(1)))


def ts_scalar(name):
    match = re.search(_SCALAR.format(name=name), ts_source())
    assert match, f"no `export const {name} = '...'` in {DATA_TS}"
    return match.group(1)


class TestParity:
    """The tables, held level with the editor half's."""

    def test_the_ts_file_is_where_this_test_thinks_it_is(self):
        assert DATA_TS.is_file(), DATA_TS
        assert ts_pairs("CATEGORIES"), "the parser found an empty table"

    def test_categories_match(self):
        assert ts_pairs("CATEGORIES") == actions_data.CATEGORIES

    def test_default_category_matches(self):
        assert ts_scalar("DEFAULT_CATEGORY") == actions_data.DEFAULT_CATEGORY
        assert actions_data.DEFAULT_CATEGORY in actions_data.CATEGORY_IDS

    def test_link_schemes_match(self):
        assert ts_array("LINK_SCHEMES") == actions_data.LINK_SCHEMES

    def test_the_derived_key_set_matches(self):
        from derico.blicca.actionsblock.actions_transform import DERIVED_FIELDS

        assert ts_array("DERIVED_KEYS") == DERIVED_FIELDS


class TestCategory:
    def test_stored_category_wins_when_offered(self):
        assert actions_data.effective_category({"category": "user"}) == "user"

    @pytest.mark.parametrize("stored", [None, "", "bogus", 42, ["user"], "User"])
    def test_anything_else_is_the_default(self, stored):
        assert actions_data.effective_category({"category": stored}) == "site_actions"

    def test_whitespace_around_a_stored_category_is_forgiven(self):
        assert actions_data.effective_category({"category": " user "}) == "user"

    def test_labels(self):
        assert actions_data.category_label("site_actions") == "Site actions"
        assert actions_data.category_label("object_buttons") == "Object buttons"
        assert actions_data.category_label("bogus") == ""


class TestScreen:
    @pytest.mark.parametrize(
        "value",
        [
            "/sitemap",
            "sitemap",
            "http://nohost/plone/sitemap",
            "HTTPS://example.org/x",
            "mailto:md@derico.de",
            "tel:+49123",
        ],
    )
    def test_passes_a_usable_link(self, value):
        assert actions_data.screen_link(value) == value

    @pytest.mark.parametrize(
        "value",
        ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "//evil.example/x"],
    )
    def test_rejects_an_unfollowable_link(self, value):
        assert actions_data.screen_link(value) == ""

    @pytest.mark.parametrize("value", [None, "", "  ", 42, [], {}, True])
    def test_answers_absent_for_anything_that_is_not_a_string(self, value):
        assert actions_data.screen_link(value) == ""


class TestEntries:
    def test_reads_the_stored_category_out_of_the_catalog(self):
        data = {
            "category": "user",
            "catalog": {
                "site_actions": [{"id": "sitemap", "title": "Site Map", "url": "/sitemap"}],
                "user": [{"id": "login", "title": "Log in", "url": "/login"}],
            },
        }
        assert actions_data.entries(data) == [
            {
                "id": "login",
                "title": "Log in",
                "href": "/login",
                "css": "actions-item actions-item-login",
            }
        ]

    def test_answers_nothing_without_a_catalog(self):
        assert actions_data.entries({}) == []
        assert actions_data.entries({"catalog": None}) == []
        assert actions_data.entries({"catalog": "x"}) == []
        assert actions_data.entries({"catalog": {"site_actions": "x"}}) == []

    def test_drops_half_rows(self):
        data = {
            "catalog": {
                "site_actions": [
                    {"id": "a", "title": "", "url": "/a"},
                    {"id": "b", "title": "B"},
                    {"id": "c", "title": "C", "url": "javascript:x"},
                    "d",
                    {"id": "e", "title": "E", "url": "/e"},
                ]
            }
        }
        assert [row["id"] for row in actions_data.entries(data)] == ["e"]

    @pytest.mark.parametrize(
        ("action_id", "css"),
        [
            ("sitemap", "actions-item actions-item-sitemap"),
            ("folderContents", "actions-item actions-item-folderContents"),
            ("index_html", "actions-item actions-item-index_html"),
            ("site map", "actions-item"),
            ("a.b", "actions-item"),
            ("", "actions-item"),
            (None, "actions-item"),
        ],
    )
    def test_item_class(self, action_id, css):
        assert actions_data.item_class(action_id) == css
