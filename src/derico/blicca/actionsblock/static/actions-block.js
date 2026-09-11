import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useId } from "react";
import config from "@plone/registry";
import { getStyleFieldDefinitionsFromRegistry } from "@plone/helpers";
const CATEGORIES = [
  ["site_actions", "Site actions"],
  ["portal_tabs", "Portal tabs"],
  ["user", "User actions"],
  ["document_actions", "Document actions"],
  ["object", "Object actions"],
  ["object_buttons", "Object buttons"]
];
const CATEGORY_IDS = CATEGORIES.map(([id]) => id);
const DEFAULT_CATEGORY = "site_actions";
const LINK_SCHEMES = ["http", "https", "mailto", "tel"];
const SLUG = /^[A-Za-z0-9_-]+$/;
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
function screenLink(value) {
  const raw = text(value);
  if (!raw || raw.startsWith("//")) return "";
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(raw);
  if (!scheme) return raw;
  return LINK_SCHEMES.includes(scheme[1].toLowerCase()) ? raw : "";
}
function effectiveCategory(data) {
  const stored = text(data.category);
  return CATEGORY_IDS.includes(stored) ? stored : DEFAULT_CATEGORY;
}
function categoryLabel(category) {
  const row = CATEGORIES.find(([id]) => id === category);
  return row ? row[1] : "";
}
function title(data) {
  return text(data.title);
}
function catalog(data) {
  const value = data.catalog;
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function itemClass(actionId) {
  const slug = text(actionId);
  return slug && SLUG.test(slug) ? `actions-item actions-item-${slug}` : "actions-item";
}
function entries(data) {
  const rows = catalog(data)?.[effectiveCategory(data)];
  if (!Array.isArray(rows)) return [];
  const found = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const record = row;
    const label = text(record.title);
    const href = screenLink(record.url);
    if (!label || !href) continue;
    found.push({
      id: text(record.id),
      title: label,
      href,
      css: itemClass(record.id)
    });
  }
  return found;
}
const EDIT_SUFFIX = /\/(?:@@[^/]+|edit)\/?$/;
function apiPath() {
  const settings = config.settings;
  const value = settings?.apiPath;
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";
}
function actionsEndpoint(location, base) {
  const root = base.replace(/\/+$/, "");
  if (!root) return null;
  let rootPath = "";
  try {
    rootPath = new URL(root, location.origin).pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
  let path = location.pathname.replace(EDIT_SUFFIX, "").replace(/\/+$/, "");
  if (rootPath && path === rootPath) path = "";
  else if (rootPath && path.startsWith(`${rootPath}/`)) path = path.slice(rootPath.length);
  return `${root}${path}/@actions`;
}
const inflight = /* @__PURE__ */ new Map();
function fetchCatalog(url) {
  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    }).then((response) => response.ok ? response.json() : null).then(
      (body) => body && typeof body === "object" && !Array.isArray(body) ? body : null
    ).catch(() => null);
    inflight.set(url, pending);
  }
  return pending;
}
function useCatalog(data) {
  const stored = catalog(data);
  const [fetched, setFetched] = useState(
    null
  );
  const endpoint = stored || typeof globalThis.location === "undefined" ? null : actionsEndpoint(globalThis.location, apiPath());
  useEffect(() => {
    if (!endpoint) return;
    let live = true;
    fetchCatalog(endpoint).then((result) => {
      if (live) setFetched({ url: endpoint, catalog: result });
    });
    return () => {
      live = false;
    };
  }, [endpoint]);
  if (stored) return { catalog: stored, state: "stored" };
  if (!endpoint) return { catalog: null, state: "failed" };
  if (!fetched || fetched.url !== endpoint) return { catalog: null, state: "loading" };
  return fetched.catalog ? { catalog: fetched.catalog, state: "fetched" } : { catalog: null, state: "failed" };
}
function ActionsView({ data = {}, isEditMode }) {
  const category = effectiveCategory(data);
  const heading = title(data);
  const rows = entries(data);
  return /* @__PURE__ */ jsxs(
    "nav",
    {
      className: `actions-block has--category--${category}`,
      "aria-label": categoryLabel(category),
      children: [
        heading ? /* @__PURE__ */ jsx("h2", { className: "actions-title", children: heading }) : null,
        rows.length ? /* @__PURE__ */ jsx("ul", { className: "actions-list", children: rows.map((row, index) => /* @__PURE__ */ jsx("li", { className: row.css, children: /* @__PURE__ */ jsx("a", { className: "actions-link", ...isEditMode ? {} : { href: row.href }, children: row.title }) }, `${row.id}:${index}`)) }) : null
      ]
    }
  );
}
function ActionsEdit(props) {
  const data = props.data ?? {};
  const { catalog: catalog2, state } = useCatalog(data);
  const preview = catalog2 ? { ...data, catalog: catalog2 } : data;
  const label = categoryLabel(effectiveCategory(preview)).toLowerCase();
  const rows = entries(preview);
  const notes = [];
  if (state === "loading") {
    notes.push("Loading the actions for this page…");
  } else if (state === "failed") {
    notes.push(
      "The actions could not be loaded for the preview. Save and reload the page to see them."
    );
  } else if (!rows.length) {
    notes.push(`No ${label} are available to you here, so the block renders empty.`);
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(ActionsView, { data: preview, isEditMode: true }),
    notes.map((note) => /* @__PURE__ */ jsx("p", { className: "actions-notice", contentEditable: false, children: note }, note))
  ] });
}
function ActionsIcon(props) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.5",
      strokeLinecap: "round",
      "aria-hidden": "true",
      focusable: "false",
      ...props,
      children: [
        /* @__PURE__ */ jsx("circle", { cx: "5", cy: "7", r: "1", fill: "currentColor" }),
        /* @__PURE__ */ jsx("circle", { cx: "5", cy: "12", r: "1", fill: "currentColor" }),
        /* @__PURE__ */ jsx("circle", { cx: "5", cy: "17", r: "1", fill: "currentColor" }),
        /* @__PURE__ */ jsx("path", { d: "M9 7h10" }),
        /* @__PURE__ */ jsx("path", { d: "M9 12h7" }),
        /* @__PURE__ */ jsx("path", { d: "M9 17h9" })
      ]
    }
  );
}
const ACTIONS_BLOCK_TYPE = "actions";
const BACKGROUND_FIELD_NAME = "backgroundColor";
function backgroundField(data) {
  const definitions = getStyleFieldDefinitionsFromRegistry(BACKGROUND_FIELD_NAME, {
    data,
    blockType: ACTIONS_BLOCK_TYPE,
    fieldName: BACKGROUND_FIELD_NAME
  });
  const choices = definitions.filter((definition) => typeof definition?.name === "string").map((definition) => [definition.name, definition.label || definition.name]);
  if (!choices.length) return null;
  return {
    title: "Background",
    choices,
    ...choices.some(([name]) => name === "none") ? { default: "none" } : {},
    styleField: true
  };
}
function ActionsSchema({
  formData = {}
} = {}) {
  const background = backgroundField(formData);
  return {
    title: "Actions",
    fieldsets: [
      {
        id: "default",
        title: "Default",
        fields: ["category", "title"]
      },
      {
        id: "styling",
        title: "Styling",
        fields: ["blockWidth", ...background ? [BACKGROUND_FIELD_NAME] : []]
      }
    ],
    properties: {
      category: {
        title: "Actions",
        description: "Which of the site’s action categories to list.",
        widget: "actions_select",
        choices: CATEGORIES.map(([id, label]) => [id, label]),
        // NOT a storage guarantee — both renderers fall back to it themselves.
        default: DEFAULT_CATEGORY
      },
      title: {
        title: "Heading",
        description: "Optional heading above the list."
      },
      blockWidth: {
        title: "Block width",
        widget: "width",
        default: "default",
        styleField: true
      },
      ...background ? { [BACKGROUND_FIELD_NAME]: background } : {}
    },
    required: []
  };
}
const labelClass = "w-fit cursor-default text-xs font-medium text-quanta-pigeon";
const controlClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
function FieldShell({
  label,
  description,
  className,
  blockClass,
  render
}) {
  const controlId = useId();
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `${blockClass} flex flex-col gap-1${className ? ` ${className}` : ""}`,
      children: [
        label ? /* @__PURE__ */ jsx("label", { htmlFor: controlId, className: labelClass, children: label }) : null,
        render(controlId),
        description ? /* @__PURE__ */ jsx("p", { className: "text-xs font-normal text-quanta-pigeon", children: description }) : null
      ]
    }
  );
}
const asText = (value) => typeof value === "string" ? value : value == null ? "" : String(value);
function ActionsSelectWidget(props) {
  const { label, description, className, choices = [], onChange } = props;
  const stored = asText(props.value ?? props.defaultValue);
  const current = stored || asText(props.default);
  const known = choices.some(([value]) => value === current);
  return /* @__PURE__ */ jsx(
    FieldShell,
    {
      blockClass: "actions-select-widget",
      label,
      description,
      className,
      render: (controlId) => /* @__PURE__ */ jsxs(
        "select",
        {
          id: controlId,
          name: props.name,
          required: props.required,
          value: current,
          onChange: (event) => onChange?.(event.target.value),
          className: controlClass,
          children: [
            current === "" ? /* @__PURE__ */ jsx("option", { value: "" }) : null,
            current !== "" && !known ? /* @__PURE__ */ jsx("option", { value: current, children: current }) : null,
            choices.map(([value, choiceLabel]) => /* @__PURE__ */ jsx("option", { value, children: choiceLabel }, value))
          ]
        }
      )
    }
  );
}
const ACTIONS_WIDGETS = {
  actions_select: ActionsSelectWidget
};
function registerActionsWidgets(config2) {
  config2.registerWidget({ key: "widget", definition: { ...ACTIONS_WIDGETS } });
  return config2;
}
const ActionsBlockInfo = {
  id: ACTIONS_BLOCK_TYPE,
  title: "Actions",
  edit: ActionsEdit,
  view: ActionsView,
  blockSchema: ActionsSchema,
  icon: ActionsIcon,
  category: "actions"
};
function install(config2) {
  registerActionsWidgets(config2);
  config2.blocks.blocksConfig[ACTIONS_BLOCK_TYPE] = ActionsBlockInfo;
  return config2;
}
export {
  ACTIONS_BLOCK_TYPE,
  ActionsBlockInfo,
  ActionsEdit,
  ActionsIcon,
  ActionsSchema,
  ActionsView,
  install as default
};
//# sourceMappingURL=actions-block.js.map
